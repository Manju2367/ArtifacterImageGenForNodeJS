"use strict"

const TextToSVG = require("text-to-svg")



/**
 * 
 * @param {String} text 
 * @param {Object} options 
 * @param {Number} options.x 
 * @param {Number} options.y 
 * @param {String} options.fontLocation 
 * @param {Number} options.fontSize 
 * @param {String} options.fontColor 
 * @returns {Buffer}
 */
module.exports = (text, options={
    x: 0,
    y: 0
}) => {
    const textToSVG = TextToSVG.loadSync(options.fontLocation)
    return Buffer.from(textToSVG.getSVG(text, {
        x: options.x,
        y: options.y,
        anchor: "left top",
        fontSize: options.fontSize,
        attributes: {
            fill: options.fontColor
        }
    }))
}
