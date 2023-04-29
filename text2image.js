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
module.exports = (text, options={
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
