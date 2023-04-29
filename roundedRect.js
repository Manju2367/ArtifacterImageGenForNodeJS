/**
 * Function to generate the SVG path `d` attribute content to draw a rounded rectangle.
 *
 * @param {Number} x X coordinate
 * @param {Number} y Y coordinate
 * @param {Number} w bar width
 * @param {Number} h bar height
 * @param {Number} r corner radius
 * @param {Object} [options]
 * @param {Boolean} [options.tl] top-left corner should be rounded?
 * @param {Boolean} [options.tr] top-right corner should be rounded?
 * @param {Boolean} [options.bl] bottom-left corner should be rounded?
 * @param {Boolean} [options.br] bottom-right corner should be rounded?
 * @param {String} [options.fill] fill color
 * @returns {string} the value to insert in the `d` attribute of the path element
 */
module.exports = (x, y, w, h, r, options={
    tl: true,
    tr: true,
    bl: true,
    br: true,
    fill: "#000"
}) => {
    let d
    d  = "M" + (x + r) + "," + y
    d += "h" + (w - 2*r)
    if (options.tr) { d += "a" + r + "," + r + " 0 0 1 " + r + "," + r; }
    else { d += "h" + r; d += "v" + r; }
    d += "v" + (h - 2*r)
    if (options.br) { d += "a" + r + "," + r + " 0 0 1 " + -r + "," + r; }
    else { d += "v" + r; d += "h" + -r; }
    d += "h" + (2*r - w)
    if (options.bl) { d += "a" + r + "," + r + " 0 0 1 " + -r + "," + -r; }
    else { d += "h" + -r; d += "v" + -r; }
    d += "v" + (2*r - h)
    if (options.tl) { d += "a" + r + "," + r + " 0 0 1 " + r + "," + -r; }
    else { d += "v" + -r; d += "h" + r; }
    d += "z"
    let svg = `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${ w } ${ h }" width="${ w }" height="${ h }"><path d="${ d }" fill="${ options.fill }" /></svg>`
    return svg
}