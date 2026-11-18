const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * 「查看出处」图标：13×13 斜向箭头。
 * 按钮内容只有这个图标，文字说明走 title / aria-label，不参与排布。
 */
export function jumpIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '13')
  svg.setAttribute('height', '13')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')
  for (const d of ['M11.6 4.4 5.6 10.4', 'M5.6 6.8v3.6h3.6']) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '1.2')
    svg.appendChild(path)
  }
  return svg
}
