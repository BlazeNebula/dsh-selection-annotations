const SVG_NS = 'http://www.w3.org/2000/svg'

/**
 * 「查看出处」图标：13×13，底部一条横线表示目标行，斜箭头从上方落到这条线上。
 * 按钮内容只有这个图标，文字说明走 title / aria-label，不参与排布。
 */
export function jumpIcon() {
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('viewBox', '0 0 16 16')
  svg.setAttribute('width', '13')
  svg.setAttribute('height', '13')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('aria-hidden', 'true')
  for (const d of [
    'M2.8 12.2h10.4',
    'M7.3 4.1 10.9 11.5M8.9 10.2 10.9 11.5 11.2 9.2',
  ]) {
    const path = document.createElementNS(SVG_NS, 'path')
    path.setAttribute('d', d)
    path.setAttribute('stroke', 'currentColor')
    path.setAttribute('stroke-width', '1.2')
    svg.appendChild(path)
  }
  return svg
}
