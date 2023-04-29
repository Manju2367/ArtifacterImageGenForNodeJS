"use strict"

const path = require("path")
const { EnkaClient, Character, Artifact } = require("enka-network-api")
const sharp = require("sharp")
const Jimp = require("jimp")
const text2image = require("./text2image")
const { exit } = require("process")

const testPath = path.join(__dirname, "test")
const assetsPath = path.join(__dirname, "assets")
const fontPath = path.join(assetsPath, "ja-jp.ttf")
const basePath = path.join(__dirname, "base")
const characterPath = path.join(__dirname, "character")
const weaponPath = path.join(__dirname, "weapon")

const baseSize = {
    width: 1920,
    height: 1080
}

const enka = new EnkaClient({
    defaultLanguage: "jp",
    defaultImageBaseUrl: "https://enka.network/ui"
})

const fightProp = {
    FIGHT_PROP_HP               : "HP",
    FIGHT_PROP_HP_PERCENT       : "HPパーセンテージ",
    FIGHT_PROP_ATTACK           : "攻撃力",
    FIGHT_PROP_ATTACK_PERCENT   : "攻撃パーセンテージ",
    FIGHT_PROP_DEFENSE          : "防御力",
    FIGHT_PROP_DEFENSE_PERCENT  : "防御パーセンテージ",
    FIGHT_PROP_ELEMENT_MASTERY  : "元素熟知",
    FIGHT_PROP_CRITICAL         : "会心率",
    FIGHT_PROP_CRITICAL_HURT    : "会心ダメージ",
    FIGHT_PROP_HEAL_ADD         : "与える治療効果",
    FIGHT_PROP_CHARGE_EFFICIENCY: "元素チャージ効率",
    FIGHT_PROP_FIRE_ADD_HURT    : "炎元素ダメージ",
    FIGHT_PROP_WATER_ADD_HURT   : "水元素ダメージ",
    FIGHT_PROP_GRASS_ADD_HURT   : "草元素ダメージ",
    FIGHT_PROP_ELEC_ADD_HURT    : "雷元素ダメージ",
    FIGHT_PROP_WIND_ADD_HURT    : "風元素ダメージ",
    FIGHT_PROP_ICE_ADD_HURT     : "氷元素ダメージ",
    FIGHT_PROP_ROCK_ADD_HURT    : "岩元素ダメージ",
    FIGHT_PROP_PHYSICAL_ADD_HURT: "物理ダメージ"
}



/**
 * 聖遺物のスコア計算
 * @param {Artifact} artifact 聖遺物
 * @param {"hp"|"atk"|"def"|"chg"|"mst"} type 換算
 * @returns {Number} 
 */
const calcScore = (artifact, type="atk") => {
    let score = 0
    artifact.substats.total.forEach(stat => {
        let value = Math.floor(stat.getFormattedValue() * 10) / 10

        // 会心率
        if(fightProp[stat.id] === "会心率") {
            score += (value * 2)
        }
        // 会心ダメージ
        if(fightProp[stat.id] === "会心ダメージ") {
            score += value
        }

        // HP%, 攻撃力%, 防御力%, 元素チャージ効率換算
        if(
            (type === "hp"  && fightProp[stat.id] === "HPパーセンテージ")  ||
            (type === "atk" && fightProp[stat.id] === "攻撃パーセンテージ") ||
            (type === "def" && fightProp[stat.id] === "防御パーセンテージ") ||
            (type === "chg" && fightProp[stat.id] === "元素チャージ効率")
        ) {
            score += value
        }
        // 元素熟知換算
        if(type == "mst" && fightProp[stat.id] === "元素熟知") {
            score += (value * 0.25)
        }
    })

    return Math.round(score * 10) / 10
}

/**
 * 
 * @param {Character} character 
 * @param {"hp"|"atk"|"def"|"chg"|"mst"} calcType 
 */
const generate = async (character, calcType) => {
    const characterElement          = character.characterData.element.name.get("jp").charAt(0)
    const characterName             = ["空", "蛍"].includes(character.characterData.name.get("jp")) ?
                                      (character.characterData.gender === "MALE" ? `空(${ characterElement })` : `蛍(${ characterElement })`) :
                                      character.characterData.name.get("jp")
    const characterStatus           = character.status
    const characterConstellations   = character.characterData.constellations
    const characterLevel            = character.level
    const characterFriendship       = character.friendship
    const characterTalent           = {
        normalAttack    : character.characterData.normalAttack,
        elementalSkill  : character.characterData.elementalSkill,
        elementalBurst  : character.characterData.elementalBurst
    }
    
    const weapon                    = character.weapon
    const weaponName                = weapon.weaponData.name.get("jp")
    const weaponLevel               = weapon.level
    const weaponRank                = weapon.refinementRank
    const weaponRarelity            = weapon.weaponData.stars
    const weaponBaseAtk             = weapon.weaponStats[0].value
    const weaponSubStatusName       = weapon.weaponStats[1].type.get("jp")
    const weaponSubStatusValue      = weapon.weaponStats[1].isPercent ?
                                      Math.round(weapon.weaponStats[1].value * 1000) / 10 :
                                      weapon.weaponStats[1]

    const artifacts                 = character.artifacts
    const scoreFlower               = calcScore(artifacts[0], calcType)
    const scoreWing                 = calcScore(artifacts[1], calcType)
    const scoreClock                = calcScore(artifacts[2], calcType)
    const scoreCup                  = calcScore(artifacts[3], calcType)
    const scoreCrown                = calcScore(artifacts[4], calcType)



    const characterImageSize = {
        width : Math.floor(1439 * 0.75),
        height: Math.floor(1024 * 0.75)
    }

    // ベース
    let base = await Jimp.read(path.join(basePath, `${ characterElement }.png`))
    let shadow = await Jimp.read(path.join(assetsPath, "Shadow.png"))



    // キャラクター
    let characterPaste = new Jimp(baseSize.width, baseSize.height).rgba(true)
    let characterImage = (await Jimp.read(path.join(characterPath, characterName, "splashImage.png")))
        .crop(289, 0, 1439, 1024)
        .scale(0.75)
    let characterAvatarMask = (await Jimp.read(path.join(assetsPath, "CharacterMask.png")))
        .grayscale()
        .resize(characterImageSize.width, characterImageSize.height)

    characterPaste.composite(characterImage.mask(characterAvatarMask), -160, -45)

    let characterNameImage = await Jimp.read(
        await text2image(characterName, {
            fontLocation: fontPath,
            fontSize: 48,
            fontColor: "#FFF"
        })
    )



    // 武器
    let weaponImage = (await Jimp.read(path.join(weaponPath, `${ weaponName }.png`)))
        .resize(128, 128)
    let weaponPaste = new Jimp(baseSize.width, baseSize.height)

    weaponPaste.composite(weaponImage, 1430, 50)

    let weaponRareImage = (await Jimp.read(path.join(assetsPath, "Rarelity", `${ weaponRarelity }.png`)))
        .scale(0.97)
    let weaponRarePaste = new Jimp(baseSize.width, baseSize.height)
    weaponRarePaste.composite(weaponRareImage, 1422, 173)

    

    // 天賦
    let talentBase = (await Jimp.read(path.join(assetsPath, "TalentBack.png")))
        .scale(2/3)
    let talentBasePaste = new Jimp(baseSize.width, baseSize.height)

    await Promise.all(Object.keys(characterTalent).map(async (t, i) => {
        let talentPaste = new Jimp(talentBase.bitmap.width, talentBase.bitmap.height)
        let talent = (await Jimp.read(path.join(characterPath, characterName, `${ t }.png`)))
            .resize(50, 50)
        talentPaste.composite(talent, Math.floor(talentPaste.bitmap.width/2)-25, Math.floor(talentPaste.bitmap.height/2)-25)
        
        let talentBaseClone  = talentBase.clone()
            .composite(talentPaste, 0, 0)
        talentBasePaste.composite(talentBaseClone, 15, 330 + i*105)
    }))

    // 凸

    // 聖遺物

    // 合成
    base
        .composite(characterPaste, 0, 0)
        .composite(shadow, 0, 0)
        .composite(characterNameImage, 30, 20)
        .composite(weaponPaste, 0, 0)
        .composite(weaponRarePaste, 0, 0)
        .composite(talentBasePaste, 0, 0)
        .write(path.join(testPath, "test.png"), (err) => {
            if(err) console.log(err)
            else console.log("generated")
        })
}

enka.fetchUser("800282666").then(result => {
    generate(result.characters[0])
})
