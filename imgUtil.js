"use strict"

const TextToSVG = require("text-to-svg")
const sharp = require("sharp")



/**
 * 
 * @param {String} text 
 * @param {Object} options 
 * @param {Number} options.x 
 * @param {Number} options.y 
 * @param {String} options.fontLocation 
 * @param {Number} options.fontSize 
 * @param {String} options.fontColor 
 * @returns {Promise<Buffer>}
 */
const text2image = (text, options={
    x: 0,
    y: 0
}) => {
    const textToSVG = TextToSVG.loadSync(options.fontLocation)
    return sharp(Buffer.from(textToSVG.getSVG(text, {
        x: options.x,
        y: options.y,
        anchor: "left top",
        fontSize: options.fontSize,
        attributes: {
            fill: options.fontColor
        }
    }))).png().toBuffer()
}



/**
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
 * @returns {Promise<Buffer>}
 */
const roundedRect = (x, y, w, h, r, options={
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
    
    return sharp(Buffer.from(svg)).png().toBuffer()
}



const toHex = d => {
    let e = "0" + d.toString(16).toUpperCase()
    return e.substring(e.length - 2)
}

/**
 * 16進数のカラーコード
 * @param {Number} r 0-255
 * @param {Number} g 0-255
 * @param {Number} b 0-255
 * @returns {String}
 */
const rgb = (r, g, b) => {
    r = Math.floor(r < 0 ? r = 0 : r > 255 ? r = 255 : r)
    g = Math.floor(g < 0 ? g = 0 : g > 255 ? g = 255 : g)
    b = Math.floor(b < 0 ? b = 0 : b > 255 ? b = 255 : b)

    return `#${ toHex(r) }${ toHex(g)}${ toHex(b) }`
}

/**
 * rgba
 * @param {Number} r 0-255
 * @param {Number} g 0-255
 * @param {Number} b 0-255
 * @param {Number} a 0.0-1.0
 * @returns {String}
 */
const rgba = (r, g, b, a) => {
    r = Math.floor(r < 0 ? r = 0 : r > 255 ? r = 255 : r)
    g = Math.floor(g < 0 ? g = 0 : g > 255 ? g = 255 : g)
    b = Math.floor(b < 0 ? b = 0 : b > 255 ? b = 255 : b)
    a < 0 ? a = 0 : a > 1 ? a = 1 : a

    return `rgba(${ r }, ${ g }, ${ b }, ${ a })`
}



module.exports = {
    text2image,
    roundedRect,
    rgb,
    rgba
}