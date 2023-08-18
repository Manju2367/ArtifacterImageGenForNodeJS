"use strict"

const TextToSVG = require("text-to-svg")
const sharp = require("sharp")



class TextToImage {
    /**
     * 
     * @param {String} fontLocation 
     * @param {Object} options 
     * @param {String} options.defaultFillColor 
     * @param {String} options.defaultStrokeColor 
     * @param {String} options.defaultAnchor 
     */
    constructor(fontLocation, options) {
        this.renderer = TextToSVG.loadSync(fontLocation)
        this.font = {}
        this.font.fill = options.defaultFillColor === undefined ? "#000000" : options.defaultFillColor
        this.font.stroke = options.defaultStrokeColor === undefined ? "none" : options.defaultStrokeColor
        this.anchor = options.defaultAnchor === undefined ? "left baseline" : options.defaultAnchor
    }

    /**
     * 
     * @param {String} text 
     * @param {Object} [options] 
     * @param {Object} options.font 
     * @param {Number} options.font.size 
     * @param {String} options.font.fill 
     * @param {String} options.font.stroke 
     * @param {Number} options.x 
     * @param {Number} options.y 
     * @param {String} options.anchor 
     * @returns 
     */
    render(text, options) {
        let that = this
        this.textSvg = this.renderer.getSVG(text, {
            fontSize: options.font.size === undefined ? 16 : options.font.size,
            x: options.x === undefined ? 0 : options.x,
            y: options.y === undefined ? 0 : options.y,
            anchor: options.anchor === undefined ? that.anchor : options.anchor,
            attributes: {
                fill: options.font !== undefined && options.font.fill !== undefined ? options.font.fill : that.font.fill,
                stroke: options.font !== undefined && options.font.stroke ? options.font.stroke : that.font.stroke
            }
        })
        this.textBuffer = Buffer.from(this.textSvg)
        return this
    }



    /**
     * 
     * @param {"jpg"|"png"|"webp"|"avif"|"gif"|"tiff"|"raw"} format Default format is png
     * @returns {Sharp.sharp}
     */
    toSharp(format="png") {
        this.sharpObject = sharp(this.textBuffer)
        switch(format) {
            case "jpg":
                return this.sharpObject.jpeg()
            case "png":
                return this.sharpObject.png()
            case "webp":
                return this.sharpObject.webp()
            case "avif":
                return this.sharpObject.avif()
            case "gif":
                return this.sharpObject.gif()
            case "tiff":
                return this.sharpObject.tiff()
            case "raw":
                return this.sharpObject.raw()
            default:
                return this.sharpObject.png()
        }
    }
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
 * @returns {import("sharp").Sharp}
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
    
    return sharp(Buffer.from(svg)).png()
}



/**
 * maskImageを使用してimageにマスク処理をします。
 * @param {import("sharp").Sharp} image 
 * @param {import("sharp").Sharp} maskImage 
 * @param {Object} [options] 
 * @param {Number} [options.x]
 * @param {Number} [options.y]
 * @returns {Promise<import("sharp").Sharp>}
 */
const mask = (image, maskImage, options={
    x: 0,
    y: 0
}) => {
    return new Promise((resolve, reject) => {
        image.raw().toBuffer(async (err, data, info) => {
            if(!err) {
                let maskBuffer = await maskImage.toBuffer()
                let paste = await sharp({
                    create: {
                        channels: 4,
                        background: {
                            r: 0xFF,
                            g: 0xFF,
                            b: 0xFF,
                            alpha: 1
                        },
                        width: info.width,
                        height: info.height
                    }
                }).composite([{
                    input: maskBuffer,
                    left: options.x,
                    top: options.y
                }]).grayscale().raw().toBuffer()
            
                data.forEach((d, i) => {
                    if((i - 3) % 4 === 0) {
                        data[i] *= paste[(i - 3)/4] / 0xFF
                    }
                })

                resolve(sharp(data, {
                    raw: {
                        width: info.width,
                        height: info.height,
                        channels: 4
                    }
                }).png())
            } else {
                reject(err)
            }
        })
    })
}



/**
 * 
 * @param {Number} width 
 * @param {Number} height 
 * @param {Object} [options] 
 * @param {Object} [options.background] 
 * @param {Number} [options.background.r] 0-255
 * @param {Number} [options.background.g] 0-255
 * @param {Number} [options.background.b] 0-255
 * @param {Number} [options.background.alpha] 0.0-1.0
 * @returns 
 */
const createImage = (width, height, options={
    background: {
        r: 0xFF,
        g: 0xFF,
        b: 0xFF,
        alpha: 0.0
    }
}) => {
    return sharp({
        create: {
            background: options.background,
            channels: 4,
            width: width,
            height: height
        }
    }).png()
}



/**
 * 
 * @param {import("sharp").Sharp} image1 
 * @param {import("sharp").Sharp|Array<{input: String|Buffer|{create: sharp.Create}|{text: sharp.CreateText;}, left: Number, top: Number}>} image2 
 * @returns {Promise<import("sharp").Sharp>}
 */
const composite = async (image1, image2, x=0, y=0) => {
    if(image2 instanceof Array) {
        return sharp(await sharp(await image1.toBuffer()).composite(image2).toBuffer()).png()
    } else {
        return sharp(await sharp(await image1.toBuffer()).composite([{
            input: await image2.toBuffer(),
            left: x,
            top: y
        }]).toBuffer()).png()
    }
}



module.exports = {
    TextToImage,
    roundedRect,
    mask,
    createImage,
    composite
}
