"use strict"

const path = require("path")
const { EnkaClient, Character } = require("enka-network-api")
const sharp = require("sharp")

const testPath = path.join(__dirname, "test")
const basePath = path.join(__dirname, "base")

const enka = new EnkaClient({
    defaultLanguage: "jp",
    defaultImageBaseUrl: "https://enka.network/ui"
})



/**
 * 
 * @param {Character} character 
 */
const generate = (character) => {
    const element = character.characterData.element.name.get("jp").charAt(0)

    const base = sharp(path.join(basePath, `${ element }.png`))
        .toFile(path.join(testPath, "test.png"))
}

enka.fetchUser("800282666").then(result => {
    generate(result.characters[0])
})
