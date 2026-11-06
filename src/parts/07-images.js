        function loadImageSettings() {
          const settings = { ...DEFAULT_IMAGE_SETTINGS }
          const storage = draftStorage()
          if (storage === undefined) return settings
          const parsed = safe(() => JSON.parse(storage.getItem(IMAGE_SETTINGS_KEY) ?? 'null'))
          if (parsed === null || typeof parsed !== 'object') return settings
          settings.compress = parsed.compress !== false
          const quality = Number(parsed.quality)
          if (Number.isFinite(quality)) settings.quality = Math.min(1, Math.max(0.1, quality))
          const minSize = Number(parsed.minSize)
          if (Number.isFinite(minSize)) settings.minSize = Math.min(4096, Math.max(0, Math.round(minSize)))
          return settings
        }

        function imageSettingsOf() {
          if (imageSettings === undefined) imageSettings = loadImageSettings()
          return imageSettings
        }

        function persistImageSettings() {
          const storage = draftStorage()
          if (storage === undefined) return
          safe(() => storage.setItem(IMAGE_SETTINGS_KEY, JSON.stringify(imageSettingsOf())))
        }

        /** 批注指令：读坏了或读成空串时回落到默认文案。*/
        function loadInstructionSettings() {
          const storage = draftStorage()
          if (storage === undefined) return DEFAULT_INSTRUCTION
          const parsed = safe(() => JSON.parse(storage.getItem(INSTRUCTION_SETTINGS_KEY) ?? 'null'))
          if (parsed === null || typeof parsed !== 'object') return DEFAULT_INSTRUCTION
          const text = typeof parsed.text === 'string' ? parsed.text : ''
          return text.trim() === '' ? DEFAULT_INSTRUCTION : text
        }

        function instructionOf() {
          if (instructionSettings === undefined) instructionSettings = loadInstructionSettings()
          // 没改过就用当前语言对应的默认文案；改过就保留用户自己的措辞。
          return isDefaultInstruction(instructionSettings) ? defaultInstruction() : instructionSettings
        }

        function persistInstructionSettings(text) {
          instructionSettings = text
          const storage = draftStorage()
          if (storage === undefined) return
          safe(() => storage.setItem(INSTRUCTION_SETTINGS_KEY, JSON.stringify({ text })))
        }

        function jpegName(name) {
          const base = typeof name === 'string' && name !== '' ? name : 'image'
          return `${base.replace(/\.[^.]+$/, '')}.jpg`
        }

        /**
         * 按设置把图片重编码成 JPEG。透明区域先填白 —— JPEG 没有 alpha，不填会变黑。
         * 压缩没变小、或不需要压缩时保留原文件，避免把小图越压越大。
         */
        async function compressImage(file) {
          const settings = imageSettingsOf()
          if (!settings.compress) return file
          if (typeof createImageBitmap !== 'function') return file
          let bitmap
          try {
            bitmap = await createImageBitmap(file)
          } catch {
            return file
          }
          try {
            if (Math.max(bitmap.width, bitmap.height) <= settings.minSize) return file
            const canvas = document.createElement('canvas')
            canvas.width = bitmap.width
            canvas.height = bitmap.height
            const painter = canvas.getContext('2d')
            if (painter === null) return file
            painter.fillStyle = '#ffffff'
            painter.fillRect(0, 0, canvas.width, canvas.height)
            painter.drawImage(bitmap, 0, 0)
            const blob = await new Promise((resolve) => {
              try {
                canvas.toBlob(resolve, 'image/jpeg', settings.quality)
              } catch {
                resolve(null)
              }
            })
            if (blob === null || blob.size >= file.size) return file
            return new File([blob], jpegName(file.name), { type: 'image/jpeg' })
          } finally {
            safe(() => bitmap.close?.())
          }
        }

        /**
         * 生成一张小缩略图（data URL）。已提交台账里只放缩略图：原尺寸 data URL 会把存储撑爆，
         * 而清单里需要的是「看得出是哪张图。 点击放大。
         */
        async function downscaleDataUrl(file, maxSide, quality) {
          if (typeof createImageBitmap !== 'function') return undefined
          let bitmap
          try {
            bitmap = await createImageBitmap(file)
          } catch {
            return undefined
          }
          try {
            const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
            const width = Math.max(1, Math.round(bitmap.width * scale))
            const height = Math.max(1, Math.round(bitmap.height * scale))
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const painter = canvas.getContext('2d')
            if (painter === null) return undefined
            painter.fillStyle = '#ffffff'
            painter.fillRect(0, 0, width, height)
            painter.drawImage(bitmap, 0, 0, width, height)
            const blob = await new Promise((resolve) => {
              try {
                canvas.toBlob(resolve, 'image/jpeg', quality)
              } catch {
                resolve(null)
              }
            })
            if (blob === null) return undefined
            return await fileToDataUrl(new File([blob], 'thumb.jpg', { type: 'image/jpeg' }))
          } finally {
            safe(() => bitmap.close?.())
          }
        }

        function fileToDataUrl(file) {
          return new Promise((resolve) => {
            try {
              const reader = new FileReader()
              reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : undefined)
              reader.onerror = () => resolve(undefined)
              reader.readAsDataURL(file)
            } catch {
              resolve(undefined)
            }
          })
        }

        /** 从本地存储恢复的图片只有 data URL：重新构造 File 才能在发送时带上字节。 */
        function dataUrlToFile(image) {
          if (typeof image?.dataUrl !== 'string' || image.dataUrl === '') return undefined
          return safe(() => {
            const comma = image.dataUrl.indexOf(',')
            if (comma < 0) return undefined
            const header = image.dataUrl.slice(0, comma)
            const match = header.match(/^data:([^;]+)/)
            const mime = match?.[1] ?? 'image/jpeg'
            const binary = atob(image.dataUrl.slice(comma + 1))
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
            const name = typeof image.name === 'string' && image.name !== '' ? image.name : 'image.jpg'
            return new File([bytes], name, { type: mime })
          })
        }

        /* --------------------------------------------------------- 宿主侧落盘通道 */

        /** 落盘通道的可用性：undefined = 还没探测，true / false = 已探测结果。 */
        let remoteStoreState

        /** 已载入会话的草稿（sessionId → 可序列化条目），切换会话时先在内存里换入换出。 */
        const remoteReplyCache = new Map()

        /** 记住宿主写入的答复批次；有变化时返回 true。*/
