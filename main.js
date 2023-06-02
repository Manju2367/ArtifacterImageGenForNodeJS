"use strict"

const path = require("path")
const { Character, Artifact } = require("enka-network-api")
const sharp = require("sharp")
const { roundedRect, mask, createImage, composite, TextToImage } = require("./imgUtil")
const { exit } = require("process")

const testPath          = path.join(__dirname, "test")
const assetsPath        = path.join(__dirname, "assets")
const fontPath          = path.join(assetsPath, "ja-jp.ttf")
const basePath          = path.join(__dirname, "base")
const characterPath     = path.join(__dirname, "character")
const weaponPath        = path.join(__dirname, "weapon")
const constellationPath = path.join(__dirname, "constellation")
const emotePath         = path.join(__dirname, "emotes")
const artifactGradePath = path.join(__dirname, "artifactGrades")
const artifactPath      = path.join(__dirname, "artifact")

const baseSize = {
    width: 1920,
    height: 1080
}

const textToImage = new TextToImage(fontPath, {
    defaultFillColor: "#FFFFFF",
    defaultAnchor: "left top"
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

const convAsMap = {
    hp: "HP",
    atk: "攻撃力",
    def: "防御力",
    chg: "元素チャージ効率",
    mst: "元素熟知"
}

const statusNameMap = {
    HP: {
        short: "HP%",
        long: "HPパーセンテージ"
    },
    攻撃力: {
        short: "攻撃%",
        long: "攻撃パーセンテージ"
    },
    防御力: {
        short: "防御%",
        long: "防御パーセンテージ"
    },
    元素チャージ効率: {
        short: "元チャ効率",
        long: "元素チャージ効率"
    }
}

const artifactTypeMap = {
    EQUIP_BRACER    : "flower",
    EQUIP_DRESS     : "crown",
    EQUIP_NECKLACE  : "wing",
    EQUIP_RING      : "cup",
    EQUIP_SHOES     : "clock"
}

const scoreRank = {
    total: {
        SS: 220,
        S: 200,
        A: 180
    },
    EQUIP_BRACER: {
        SS: 50,
        S: 45,
        A: 40
    },
    EQUIP_NECKLACE: {
        SS: 50,
        S: 45,
        A: 40
    },
    EQUIP_SHOES: {
        SS: 45,
        S: 40,
        A: 35
    },
    EQUIP_RING: {
        SS: 45,
        S: 40,
        A: 37
    },
    EQUIP_DRESS: {
        SS: 40,
        S: 35,
        A: 30
    }
}





/**
 * 聖遺物のスコア計算
 * @param {Artifact} artifact 聖遺物
 * @param {"hp"|"atk"|"def"|"chg"|"mst"} type 換算
 * @returns {Number} 
 */
const calcScore = (artifact, type="atk") => {
    if(artifact === null) return 0

    let score = 0
    artifact.substats.total.forEach(stat => {
        let value = Math.floor(stat.getFormattedValue() * 10) / 10

        // 会心率
        if(fightProp[stat.fightProp] === "会心率") {
            score += (value * 2)
        }
        // 会心ダメージ
        if(fightProp[stat.fightProp] === "会心ダメージ") {
            score += value
        }

        // HP%, 攻撃力%, 防御力%, 元素チャージ効率換算
        if(
            (type === "hp"  && fightProp[stat.fightProp] === "HPパーセンテージ")  ||
            (type === "atk" && fightProp[stat.fightProp] === "攻撃パーセンテージ") ||
            (type === "def" && fightProp[stat.fightProp] === "防御パーセンテージ") ||
            (type === "chg" && fightProp[stat.fightProp] === "元素チャージ効率")
        ) {
            score += value
        }
        // 元素熟知換算
        if(type == "mst" && fightProp[stat.fightProp] === "元素熟知") {
            score += (value * 0.25)
        }
    })

    return Math.round(score * 10) / 10
}

/**
 * コンマで3桁区切りの数字に変換
 * @param {Number} num 
 * @param {Number} round 四捨五入する桁
 * @returns {String} 
 */
const commaSplittedNumber = (num, round=-1) => {
    let str = round >= 0 ? (Math.round(num * 10**round) / 10**round).toLocaleString() : num.toLocaleString()
    let strS = str.split(".")[1]
    if(round > 0) 
        str = `${ str }${ strS === undefined ? "." : "" }${ strS === undefined ? Array(round + 1).join("0") : Array(round - strS.length + 1).join("0") }`
    return str
}

/**
 * 
 * @param {Character} character 
 * @param {"hp"|"atk"|"def"|"chg"|"mst"} calcType 
 * @returns {Promise<Buffer>} 
 */
const generate = async (character, calcType="atk") => {
    // キャラクター
    const characterElement          = character.characterData.element.name.get("jp").charAt(0)
    const characterName             = character.characterData.name.get("jp") === "旅人" ?
                                      (character.characterData.gender === "MALE" ? `空(${ characterElement })` : `蛍(${ characterElement })`) :
                                      character.characterData.name.get("jp")
    const characterStatus           = character.stats
    const characterMaxHealth        = Math.round(characterStatus.maxHealth.getFormattedValue()).toLocaleString()
    const characterBaseHealth       = Math.round(characterStatus.healthBase.getFormattedValue()).toLocaleString()
    const characterAddHealth        = (Math.round(characterStatus.maxHealth.getFormattedValue()) - Math.round(characterStatus.healthBase.getFormattedValue())).toLocaleString()
    const characterAttack           = Math.round(characterStatus.attack.getFormattedValue()).toLocaleString()
    const characterBaseAttack       = Math.round(characterStatus.attackBase.getFormattedValue()).toLocaleString()
    const characterAddAttack        = (Math.round(characterStatus.attack.getFormattedValue()) - Math.round(characterStatus.attackBase.getFormattedValue())).toLocaleString()
    const characterDefense          = Math.round(characterStatus.defense.getFormattedValue()).toLocaleString()
    const characterBaseDefense      = Math.round(characterStatus.defenseBase.getFormattedValue()).toLocaleString()
    const characterAddDefense       = (Math.round(characterStatus.defense.getFormattedValue()) - Math.round(characterStatus.defenseBase.getFormattedValue())).toLocaleString()
    const characterElementMastery   = Math.round(characterStatus.elementMastery.getFormattedValue()).toLocaleString()
    const characterCritRate         = characterStatus.critRate.getFormattedValue().toFixed(1)
    const characterCritDamage       = characterStatus.critDamage.getFormattedValue().toFixed(1)
    const characterChargeEfficiency = characterStatus.chargeEfficiency.getFormattedValue().toFixed(1)
    const characterPyroDamage       = {
        name: characterStatus.pyroDamage.fightPropName.get("jp"),
        value: Math.round(characterStatus.pyroDamage.getFormattedValue() * 10) / 10
    }
    const characterHydroDamage      = {
        name: characterStatus.hydroDamage.fightPropName.get("jp"),
        value: Math.round(characterStatus.hydroDamage.getFormattedValue() * 10) / 10
    }
    const characterCryoDamage       = {
        name: characterStatus.cryoDamage.fightPropName.get("jp"),
        value: Math.round(characterStatus.cryoDamage.getFormattedValue() * 10) / 10
    }
    const characterElectroDamage    = {
        name: characterStatus.electroDamage.fightPropName.get("jp"),
        value: Math.round(characterStatus.electroDamage.getFormattedValue() * 10) / 10
    }
    const characterDendroDamage     = {
        name: characterStatus.dendroDamage.fightPropName.get("jp"),
        value: Math.round(characterStatus.dendroDamage.getFormattedValue() * 10) / 10
    }
    const characterAnemoDamage      = {
        name: characterStatus.anemoDamage.fightPropName.get("jp"),
        value: Math.round(characterStatus.anemoDamage.getFormattedValue() * 10) / 10
    }
    const characterGeoDamage        = {
        name: characterStatus.geoDamage.fightPropName.get("jp"),
        value: Math.round(characterStatus.geoDamage.getFormattedValue() * 10) / 10
    }
    const characterPhysicalDamage   = {
        name: characterStatus.physicalDamage.fightPropName.get("jp"),
        value: Math.round(characterStatus.physicalDamage.getFormattedValue() * 10) / 10
    }
    const characterHealAdd          = {
        name: characterStatus.healAdd.fightPropName.get("jp"),
        value: Math.round(characterStatus.healAdd.getFormattedValue() * 10) / 10
    }
    const characterMaxValueStatus   = [
        characterPyroDamage, 
        characterHydroDamage, 
        characterCryoDamage, 
        characterElectroDamage, 
        characterDendroDamage, 
        characterAnemoDamage, 
        characterGeoDamage, 
        characterPhysicalDamage, 
        characterHealAdd
    ].reduce((a, b) => a.value > b.value ? a : b)
    const characterConstellations   = character.unlockedConstellations
    const characterLevel            = character.level
    const characterFriendship       = character.friendship
    const characterTalent           = {
        normalAttack    : character.skillLevels[0].level.value,
        elementalSkill  : character.skillLevels[1].level.value,
        elementalBurst  : character.skillLevels[2].level.value
    }
    
    // 武器
    const weapon                    = character.weapon
    const weaponName                = weapon.weaponData.name.get("jp")
    const weaponLevel               = weapon.level
    const weaponRank                = weapon.refinementRank
    const weaponRarelity            = weapon.weaponData.stars
    const weaponBaseAtk             = weapon.weaponStats[0].value
    const weaponSubStatusName       = weapon.weaponStats[1] ?
                                      weapon.weaponStats[1].fightPropName.get("jp") :
                                      undefined
    const weaponSubStatusValue      = weapon.weaponStats[1] ?
                                      weapon.weaponStats[1].isPercent ?
                                      weapon.weaponStats[1].getFormattedValue().toFixed(1) :
                                      weapon.weaponStats[1].getFormattedValue().toFixed() :
                                      undefined
    const weaponSubStatusType       = weapon.weaponStats[1] ?
                                      weapon.weaponStats[1].fightPropName.get("jp") :
                                      undefined

    // 聖遺物
    const artifacts                 = [null, null, null, null, null]
    character.artifacts.forEach(artifact => {
        if(artifact.artifactData.equipType === "EQUIP_BRACER") {
            artifacts[0] = artifact
        } else if(artifact.artifactData.equipType === "EQUIP_NECKLACE") {
            artifacts[1] = artifact
        } else if(artifact.artifactData.equipType === "EQUIP_SHOES") {
            artifacts[2] = artifact
        } else if(artifact.artifactData.equipType === "EQUIP_RING") {
            artifacts[3] = artifact
        } else if(artifact.artifactData.equipType === "EQUIP_DRESS") {
            artifacts[4] = artifact
        }
    })
    const scoreFlower               = calcScore(artifacts[0], calcType)
    const scoreWing                 = calcScore(artifacts[1], calcType)
    const scoreClock                = calcScore(artifacts[2], calcType)
    const scoreCup                  = calcScore(artifacts[3], calcType)
    const scoreCrown                = calcScore(artifacts[4], calcType)
    const scoreTotal                = scoreFlower + scoreWing + scoreClock + scoreCup + scoreCrown
















    
    // ベース
    let base = sharp(path.join(basePath, `${ characterElement }.png`))
    let shadow = sharp(path.join(assetsPath, "Shadow.png"))



    // キャラクター
    let characterPaste = createImage(baseSize.width, baseSize.height)
    let characterImage = sharp(path.join(characterPath, characterName, character.costume.isDefault ? "splashImage.png" : `costumes/${ character.costume.name.get("jp") }.png`))
    if(/蛍\(.\)/.test(characterName) || /空\(.\)/.test(characterName)) {
        let paste = createImage(2048, 1024)
        characterImage.resize(Math.floor(2048*0.9))
        paste.composite([{
            input: await characterImage.toBuffer(),
            left: Math.floor((2048 - 2048*0.9) / 2),
            top: (1024 - Math.floor(1024*0.9)) + 20,
        }])
        characterImage = sharp(await paste.toBuffer())
    }
    
    characterImage
        .extract({
            left: 289,
            top: 0,
            width: 1728 - 289,
            height: 1024
        })
        .resize(Math.floor((1728 - 289) * 0.75))
    let characterAvatarMask = sharp(path.join(assetsPath, "CharacterMask.png"))
        .resize(Math.floor((1728 - 289) * 0.75), Math.floor(1024 * 0.75))
    characterImage = await mask(characterImage, characterAvatarMask)

    characterPaste.composite([{
        input: await characterImage.toBuffer(),
        left: -160,
        top: -45
    }])



    // 武器
    let weaponImage = sharp(path.join(weaponPath, `${ weaponName }.png`))
        .resize(128, 128)
    let weaponPaste = createImage(baseSize.width, baseSize.height)

    let weaponNameImage = textToImage.render(weaponName, {
        font: { size: 26 }
    }).toSharp()
    let weaponLevelImage = textToImage.render(`Lv.${ weaponLevel }`, {
        font: { size: 24 }
    }).toSharp()
    let rectWeaponLevel = roundedRect(0, 0, (await weaponLevelImage.metadata()).width + 4, 28, 1)
    

    let baseAttackIcon = sharp(path.join(emotePath, "基礎攻撃力.png"))
        .resize(23, 23)
    let weaponBaseAttackImage = textToImage.render(`基礎攻撃力  ${ weaponBaseAtk }`, {
        font: { size: 23 }
    }).toSharp()

    let rectWeaponRank = roundedRect(0, 0, 40, 25, 1)
    let weaponRankImage = textToImage.render(`R${ weaponRank }`, {
        font: { size: 24 }
    }).toSharp()

    let weaponPasteList = []
    weaponPasteList.push(
        { input: await weaponImage.toBuffer(), left: 1430, top: 50 },
        { input: await weaponNameImage.toBuffer(), left: 1582, top: 47 },
        { input: await rectWeaponLevel.toBuffer(), left: 1582, top: 80 },
        { input: await weaponLevelImage.toBuffer(), left: 1584, top: 82 },
        { input: await baseAttackIcon.toBuffer(), left: 1600, top: 120 },
        { input: await weaponBaseAttackImage.toBuffer(), left: 1623, top: 120 },
        { input: await rectWeaponRank.toBuffer(), left: 1430, top: 45 },
        { input: await weaponRankImage.toBuffer(), left: 1433, top: 46 }
    )
    
    if(weaponSubStatusValue) {
        let weaponSubStatusIcon = sharp(path.join(emotePath, `${ ["HP", "攻撃力", "防御力"].includes(weaponSubStatusType) ? statusNameMap[weaponSubStatusType].long : weaponSubStatusType }.png`))
            .resize(23, 23)
        let weaponSubStatusImage = textToImage.render(`${ Object.keys(statusNameMap).includes(weaponSubStatusName) ? statusNameMap[weaponSubStatusName].short : weaponSubStatusName }  ${ weaponSubStatusValue }${ weapon.weaponStats[1].isPercent ? "%" : "" }`, {
            font: { size: 23 }
        }).toSharp()

        weaponPasteList.push(
            { input: await weaponSubStatusIcon.toBuffer(), left: 1600, top: 155 },
            { input: await weaponSubStatusImage.toBuffer(), left: 1623, top: 155 }
        )
    }

    weaponPaste.composite(weaponPasteList)

    let weaponRareImage = sharp(path.join(assetsPath, "Rarelity", `${ weaponRarelity }.png`))
    weaponRareImage.resize(Math.floor((await weaponRareImage.metadata()).width * 0.97))
    let weaponRarePaste = createImage(baseSize.width, baseSize.height)
    
    weaponRarePaste
        .composite([{ input: await weaponRareImage.toBuffer(), left: 1422, top: 173 }])

    

    // 天賦
    let talentBasePaste = createImage(baseSize.width, baseSize.height)
    let characterTalentKeys = Object.keys(characterTalent)
    for(let i = 0; i < characterTalentKeys.length; i++) {
        let talentBase = sharp(path.join(assetsPath, "TalentBack.png"))
        talentBase.resize(Math.floor((await talentBase.metadata()).width * 2/3))
    
        let talentBaseWidth = Math.floor((await talentBase.metadata()).width * 2/3)
        let talentBaseHeight = Math.floor((await talentBase.metadata()).height * 2/3)
        let talentPaste = createImage(talentBaseWidth, talentBaseHeight)
        let talent = sharp(path.join(characterPath, characterName, `${ characterTalentKeys[i] }.png`))
            .resize(50, 50)
        talentPaste = await composite(talentPaste, talent, Math.floor(talentBaseWidth/2)-25, Math.floor(talentBaseHeight/2)-25)
        talentBase = await composite(talentBase, talentPaste, 0, 0)
        talentBasePaste = await composite(talentBasePaste, talentBase, 15, 330 + i*105)
    }


    // 凸
    let constBase = sharp(path.join(constellationPath, `${ characterElement }.png`))
        .resize(90, 90)
    let constLock = sharp(path.join(constellationPath, `${ characterElement }LOCK.png`))
        .resize(90, 90)
    let constBasePaste = createImage(baseSize.width, baseSize.height)

    for(let i = 1; i < 7; i++) {
        if(i > characterConstellations.length) {
            constBasePaste = await composite(constBasePaste, constLock, 666, -10 + i*93)
        } else {
            let charConst = sharp(path.join(characterPath, characterName, `constellations${ i }.png`))
                .resize(45, 45)
            let constPaste = createImage(90, 90)
            constPaste = await composite(constPaste, charConst, Math.floor((await constPaste.metadata()).width/2) - 25, Math.floor((await constPaste.metadata()).height/2) - 23)
        
            let constBaseClone = constBase.clone()
            constBaseClone = await composite(constBaseClone, constPaste, 0, 0)
            constBasePaste = await composite(constBasePaste, constBaseClone, 666, -10 + i*93)
        }
    }



    // 左上のテキスト等
    let characterInfoPaste = createImage(baseSize.width, baseSize.height)
    let characterNameImage = textToImage.render(characterName, {
        font: { size: 48 }
    }).toSharp()
    let characterLevelImage = textToImage.render(`Lv.${ characterLevel }`, {
        font: { size: 25 }
    }).toSharp()
    let friendshipImage = textToImage.render(`${ characterFriendship }`, {
        font: { size: 25 }
    }).toSharp()
    let rectFriendShip = roundedRect(
        35 + (await characterLevelImage.metadata()).width + 5, 
        74, 
        77 + (await characterLevelImage.metadata()).width + (await friendshipImage.metadata()).width, 
        102, 
        2
    )
    let friendshipIcon = sharp(path.join(assetsPath, "Love.png"))
    friendshipIcon.resize(Math.floor((await friendshipIcon.metadata()).width * (24 / (await friendshipIcon.metadata()).height)), 24, { fit: "fill" })

    let normalAttackLevelImage = textToImage.render(`Lv.${ characterTalent.normalAttack }`, {
        font: {
            size: 17,
            fill: characterTalent.normalAttack >= 10 ? "#0FF" : "#FFF"
        }
    }).toSharp()
    let elementalSkillLevelImage = textToImage.render(`Lv.${ characterTalent.elementalSkill }`, {
        font: {
            size: 17,
            fill: characterTalent.elementalSkill >= 10 ? "#0FF" : "#FFF"
        }
    }).toSharp()
    let elementalBurstLevelImage = textToImage.render(`Lv.${ characterTalent.elementalBurst }`, {
        font: {
            size: 17,
            fill: characterTalent.elementalBurst >= 10 ? "#0FF" : "#FFF"
        }
    }).toSharp()

    characterInfoPaste
        .composite(
            [
                { input: await characterNameImage.toBuffer(), left: 30, top: 20 },
                { input: await characterLevelImage.toBuffer(), left: 35, top: 75 },
                { input: await rectFriendShip.toBuffer(), left: 0, top: 0 },
                { input: await friendshipIcon.toBuffer(), left: 42 + Math.floor((await characterLevelImage.metadata()).width), top: 76 },
                { input: await friendshipImage.toBuffer(), left: 73 + (await characterLevelImage.metadata()).width, top: 74 },
                { input: await normalAttackLevelImage.toBuffer(), left: 42, top: 397 },
                { input: await elementalSkillLevelImage.toBuffer(), left: 42, top: 502 },
                { input: await elementalBurstLevelImage.toBuffer(), left: 42, top: 607 }
            ]
        )




    // キャラクターステータス
    let characterStatusPaste = createImage(baseSize.width, baseSize.height)
    let characterStatusPasteList = []

    // HP
    let baseHealthImage = textToImage.render(characterBaseHealth, {
        font: { size: 12 }
    }).toSharp()
    let addHealthImage = textToImage.render(`+${ characterAddHealth }`, {
        font: {
            size: 12,
            fill: "#0F0"
        }
    }).toSharp()
    let maxHealthImage = textToImage.render(characterMaxHealth, {
        font: { size: 26 }
    }).toSharp()

    // 攻撃力
    let baseAttackImage = textToImage.render(characterBaseAttack, {
        font: { size: 12 }
    }).toSharp()
    let addAttackImage = textToImage.render(`+${ characterAddAttack }`, {
        font: {
            size: 12,
            fill: "#0F0"
        }
    }).toSharp()
    let attackImage = textToImage.render(characterAttack, {
        font: { size: 26 }
    }).toSharp()

    // 防御力
    let baseDefenseImage = textToImage.render(characterBaseDefense, {
        font: { size: 12 }
    }).toSharp()
    let addDefenseImage = textToImage.render(`+${ characterAddDefense }`, {
        font: {
            size: 12,
            fill: "#0F0"
        }
    }).toSharp()
    let defenseImage = textToImage.render(characterDefense, {
        font: { size: 26 }
    }).toSharp()

    // 元素熟知
    let elementMasteryImage = textToImage.render(characterElementMastery, {
        font: { size: 26 }
    }).toSharp()

    // 会心率
    let critRateImage = textToImage.render(`${ characterCritRate }%`, {
        font: { size: 26 }
    }).toSharp()

    // 会心ダメージ
    let critDamageImage = textToImage.render(`${ characterCritDamage }%`, {
        font: { size: 26 }
    }).toSharp()

    // 元素チャージ効率
    let chargeEfficiencyImage = textToImage.render(`${ characterChargeEfficiency }%`, {
        font: { size: 26 }
    }).toSharp()

    characterStatusPasteList.push(
                { input: await baseHealthImage.toBuffer(), left: 1360 - (await baseHealthImage.metadata()).width - (await addHealthImage.metadata()).width - 1, top: 97 + 70*0 },
                { input: await addHealthImage.toBuffer(), left: 1360 - (await addHealthImage.metadata()).width, top: 97 + 70*0 },
                { input: await maxHealthImage.toBuffer(), left: 1360 - (await maxHealthImage.metadata()).width, top: 67 + 70*0 },
                { input: await baseAttackImage.toBuffer(), left: 1360 - (await baseAttackImage.metadata()).width - (await addAttackImage.metadata()).width - 1, top: 97 + 70*1 },
                { input: await addAttackImage.toBuffer(), left: 1360 - (await addAttackImage.metadata()).width, top: 97 + 70*1 },
                { input: await attackImage.toBuffer(), left: 1360 - (await attackImage.metadata()).width, top: 67 + 70*1 },
                { input: await baseDefenseImage.toBuffer(), left: 1360 - (await baseDefenseImage.metadata()).width - (await addDefenseImage.metadata()).width - 1, top: 97 + 70*2 },
                { input: await addDefenseImage.toBuffer(), left: 1360 - (await addDefenseImage.metadata()).width, top: 97 + 70*2 },
                { input: await defenseImage.toBuffer(), left: 1360 - (await defenseImage.metadata()).width, top: 67 + 70*2 },
                { input: await elementMasteryImage.toBuffer(), left: 1360 - (await elementMasteryImage.metadata()).width, top: 67 + 70*3 },
                { input: await critRateImage.toBuffer(), left: 1360 - (await critRateImage.metadata()).width, top: 67 + 70*4 },
                { input: await critDamageImage.toBuffer(), left: 1360 - (await critDamageImage.metadata()).width, top: 67 + 70*5 },
                { input: await chargeEfficiencyImage.toBuffer(), left: 1360 - (await chargeEfficiencyImage.metadata()).width, top: 67 + 70*6 }
    )

    // 元素ダメージ, 治療効果
    if(characterMaxValueStatus.value > 0) {
        let maxValueStatusIcon = sharp(path.join(emotePath, `${ characterMaxValueStatus.name }.png`))
            .resize(40, 40)

        let maxValueStatusNameImage = textToImage.render(characterMaxValueStatus.name, {
            font: { size: 27 }
        }).toSharp()

        let maxValueStatusImage = textToImage.render(`${ characterMaxValueStatus.value.toFixed(1) }%`, {
            font: { size: 26 }
        }).toSharp()

        characterStatusPasteList.push(
            { input: await maxValueStatusIcon.toBuffer(), left: 787, top: 62 + 70*7 },
            { input: await maxValueStatusNameImage.toBuffer(), left: 845, top: 67 + 70*7 },
            { input: await maxValueStatusImage.toBuffer(), left: 1360 - (await maxValueStatusImage.metadata()).width, top: 67 + 70*7 }
        )
    }

    characterStatusPaste.composite(characterStatusPasteList)



    // 合計スコア
    let artifactScorePaste = createImage(baseSize.width, baseSize.height)

    let scoreTotalImage = textToImage.render(scoreTotal.toFixed(1), {
        font: { size: 75 }
    }).toSharp()
    let convAsImage = textToImage.render(`${ convAsMap[calcType] }換算`, {
        font: { size: 24 }
    }).toSharp()

    let scoreBadge
    if(scoreTotal >= scoreRank.total.SS) {
        scoreBadge = sharp(path.join(artifactGradePath, "SS.png"))
    } else if(scoreTotal >= scoreRank.total.S) {
        scoreBadge = sharp(path.join(artifactGradePath, "S.png"))
    } else if(scoreTotal >= scoreRank.total.A) {
        scoreBadge = sharp(path.join(artifactGradePath, "A.png"))
    } else {
        scoreBadge = sharp(path.join(artifactGradePath, "B.png"))
    }
    scoreBadge.resize(Math.floor((await scoreBadge.metadata()).width * 0.125))

    artifactScorePaste
        .composite(
            [
                { input: await scoreTotalImage.toBuffer(), left: 1652 - Math.floor((await scoreTotalImage.metadata()).width / 2), top: 420 },
                { input: await convAsImage.toBuffer(), left: 1867 - (await convAsImage.metadata()).width, top: 585 },
                { input: await scoreBadge.toBuffer(), left: 1806, top: 345 }
            ]
        )



    // 聖遺物
    let artifactPreviewPaste = createImage(baseSize.width, baseSize.height)
    let artifactStatusPaste = createImage(baseSize.width, baseSize.height)
    for(let i = 0; i < artifacts.length; i++) {
        if(artifacts[i] === null) continue

        let artifactMask = sharp(path.join(assetsPath, "ArtifactMask.png"))
            .resize(332, 332)
        let artifactImage = sharp(path.join(artifactPath, artifacts[i].artifactData.set.name.get("jp"), `${ artifactTypeMap[artifacts[i].artifactData.equipType] }.png`))
            .resize(332, 332)
            .modulate({
                brightness: 0.6,
                saturation: 0.6
            })
        artifactImage = await mask(artifactImage, artifactMask)

        if(["flower", "crown"].includes(artifactTypeMap[artifacts[i].artifactData.equipType])) {
            artifactPreviewPaste = await composite(artifactPreviewPaste, artifactImage, -37 + 373*i, 570)
        } else if(["wing", "cup"].includes(artifactTypeMap[artifacts[i].artifactData.equipType])) {
            artifactPreviewPaste = await composite(artifactPreviewPaste, artifactImage, -36 + 373*i, 570)
        } else {
            artifactPreviewPaste = await composite(artifactPreviewPaste, artifactImage, -35 + 373*i, 570)
        }

        // メインOP
        let mainStatus = artifacts[i].mainstat
        let mainOpName = mainStatus.fightPropName.get("jp")
        let mainOpValue = mainStatus.isPercent ? 
                          commaSplittedNumber(mainStatus.getFormattedValue(), 1) :
                          commaSplittedNumber(mainStatus.getFormattedValue(), 0)

        let mainOpIcon = sharp(path.join(emotePath, `${ Object.keys(statusNameMap).includes(mainOpName) && mainStatus.isPercent ? statusNameMap[mainOpName].long : mainOpName }.png`))
            .resize(35, 35)
        let mainOpNameImage = textToImage.render(Object.keys(statusNameMap).includes(mainOpName) && mainStatus.isPercent ? statusNameMap[mainOpName].short : mainOpName, {
            font: { size: 29 }
        }).toSharp()
        let mainOpValueImage = textToImage.render(`${ mainOpValue }${ mainStatus.isPercent ? "%" : "" }` ,{
            font: { size: 49 }
        }).toSharp()
        let artifactLevelImage = textToImage.render(`+${ artifacts[i].level - 1 }`, {
            font: { size: 21 }
        }).toSharp()
        let artifactLevelRect = roundedRect(0, 0, 45, 24, 2)

        artifactStatusPaste = await composite(artifactStatusPaste, [
            {
                input: await mainOpIcon.toBuffer(),
                left: 340 + 373*i - (await mainOpNameImage.metadata()).width,
                top: 655
            },
            {
                input: await mainOpNameImage.toBuffer(),
                left: 375 + 373*i - (await mainOpNameImage.metadata()).width,
                top: 655
            },
            {
                input: await mainOpValueImage.toBuffer(),
                left: 375 + 373*i - (await mainOpValueImage.metadata()).width,
                top: 690
            },
            {
                input: await artifactLevelRect.toBuffer(),
                left: 373 + 373*i - (await artifactLevelImage.metadata()).width,
                top: 748
            },
            {
                input: await artifactLevelImage.toBuffer(),
                left: 374 + 373*i - (await artifactLevelImage.metadata()).width,
                top: 749
            }
        ])

        // サブOP
        let subStatusTotal = artifacts[i].substats.total
        let subStatusSplit = artifacts[i].substats.split
        let subStatusGrowth = {}
        subStatusSplit.forEach(growth => {
            if(!subStatusGrowth[growth.fightPropName.get("jp")]) {
                subStatusGrowth[growth.fightPropName.get("jp")] = []
            }
            subStatusGrowth[growth.fightPropName.get("jp")].push(growth.isPercent ? 
                                                        commaSplittedNumber(growth.getFormattedValue(), 1) : 
                                                        String(Math.round(growth.getFormattedValue())))
        })
        Object.keys(subStatusGrowth).forEach(type => subStatusGrowth[type] = subStatusGrowth[type].sort().join("+"))

        for(let j = 0; j < subStatusTotal.length; j++) {
            let subOpName = subStatusTotal[j].fightPropName.get("jp")
            let subOpValue = subStatusTotal[j].isPercent ?
                             commaSplittedNumber(subStatusTotal[j].getFormattedValue(), 1) :
                             commaSplittedNumber(subStatusTotal[j].getFormattedValue(), 0)

            let subOpIcon = sharp(path.join(emotePath, `${ Object.keys(statusNameMap).includes(subOpName) && subStatusTotal[j].isPercent ? statusNameMap[subOpName].long : subOpName }.png`))
                .resize(30, 30)
            let subOpNameImage = textToImage.render(Object.keys(statusNameMap).includes(subOpName) && subStatusTotal[j].isPercent ? statusNameMap[subOpName].short : subOpName, {
                font: { size: 25 }
            }).toSharp()
            let subOpValueImage = textToImage.render(`${ subOpValue }${ subStatusTotal[j].isPercent ? "%" : "" }`, {
                font: { size: 25 }
            }).toSharp()
            let subOpGrowthImage = textToImage.render(subStatusGrowth[subOpName], {
                font: {
                    size: 11,
                    fill: "rgba(255, 255, 255, 0.7)"
                }
            }).toSharp()

            artifactStatusPaste = await composite(artifactStatusPaste, [
                {
                    input: await subOpIcon.toBuffer(),
                    left: 44 + 373*i,
                    top: 811 + 50*j
                },
                {
                    input: await subOpNameImage.toBuffer(),
                    left: 79 + 373*i,
                    top: 811 + 50*j
                },
                {
                    input: await subOpValueImage.toBuffer(),
                    left: 375 + 373*i - (await subOpValueImage.metadata()).width,
                    top: 811 + 50*j
                },
                {
                    input: await subOpGrowthImage.toBuffer(),
                    left: 375 + 373*i - (await subOpGrowthImage.metadata()).width,
                    top: 840 + 50*j
                }
            ])
        }

        // スコア
        let score = calcScore(artifacts[i], calcType)
        let scoreBadge
        if(score >= scoreRank[artifacts[i].artifactData.equipType]["SS"]) {
            scoreBadge = sharp(path.join(artifactGradePath, "SS.png"))
        } else if(score >= scoreRank[artifacts[i].artifactData.equipType]["S"]) {
            scoreBadge = sharp(path.join(artifactGradePath, "S.png"))
        } else if(score >= scoreRank[artifacts[i].artifactData.equipType]["A"]) {
            scoreBadge = sharp(path.join(artifactGradePath, "A.png"))
        } else {
            scoreBadge = sharp(path.join(artifactGradePath, "B.png"))
        }

        scoreBadge.resize(Math.floor((await scoreBadge.metadata()).width / 11))
        let scoreText = textToImage.render("Score", {
            font: {
                size: 27,
                fill: "#A0A0A0"
            }
        }).toSharp()
        let scoreImage = textToImage.render(commaSplittedNumber(score, 1), {
            font: { size: 36 }
        }).toSharp()

        artifactStatusPaste = await composite(artifactStatusPaste, [
            {
                input: await scoreBadge.toBuffer(),
                left: 85 + 373*i,
                top: 1013
            },
            {
                input: await scoreText.toBuffer(),
                left: 295 + 373*i - (await scoreImage.metadata()).width,
                top: 1025
            },
            {
                input: await scoreImage.toBuffer(),
                left: 380 + 373*i - (await scoreImage.metadata()).width,
                top: 1016
            }
        ])
    }

    let artifactSet = {}
    artifacts.forEach(a => {
        if(a !== null) {
            artifactSet[a.artifactData.set.name.get("jp")] === undefined ? 
            artifactSet[a.artifactData.set.name.get("jp")] = 1 : 
            artifactSet[a.artifactData.set.name.get("jp")]++
        }
    })
    let setCount = Object.keys(artifactSet).filter(set => artifactSet[set] >= 2)
    let setBonusPaste = createImage(baseSize.width, baseSize.height)
    for(let i = 0; i < setCount.length; i++) {
        if(artifactSet[setCount[i]] >= 4) {
            let setText = textToImage.render(setCount[i], {
                font: {
                    size: 23,
                    fill: "#0F0"
                }
            }).toSharp()
            let setCountRect = roundedRect(0, 0, 44, 25, 1)
            let setCountImage = textToImage.render(String(artifactSet[setCount[i]]), {
                font: { size: 19 }
            }).toSharp()
            setBonusPaste = await composite(setBonusPaste, [
                {
                    input: await setText.toBuffer(),
                    left: 1536,
                    top: 263
                },
                {
                    input: await setCountRect.toBuffer(),
                    left: 1818,
                    top: 263
                },
                {
                    input: await setCountImage.toBuffer(),
                    left: 1834,
                    top: 265
                }
            ])
        } else if(artifactSet[setCount[i]] >= 2) {
            let setText = textToImage.render(setCount[i], {
                font: {
                    size: 23,
                    fill: "#0F0"
                }
            }).toSharp()
            let setCountRect = roundedRect(0, 0, 44, 25, 1)
            let setCountImage = textToImage.render(String(artifactSet[setCount[i]]), {
                font: { size: 19 }
            }).toSharp()
            setBonusPaste = await composite(setBonusPaste, [
                {
                    input: await setText.toBuffer(),
                    left: 1536,
                    top: 243 + 35*i
                },
                {
                    input: await setCountRect.toBuffer(),
                    left: 1818,
                    top: 243 + 35*i
                },
                {
                    input: await setCountImage.toBuffer(),
                    left: 1834,
                    top: 245 + 35*i
                }
            ])
        }
    }



    // 合成
    return await base.composite(
        [
            { input: await characterPaste.toBuffer(), left: 0, top: 0 },
            { input: await shadow.toBuffer(), left: 0, top: 0},
            { input: await weaponPaste.toBuffer(), left: 0, top: 0},
            { input: await weaponRarePaste.toBuffer(), left: 0, top: 0},
            { input: await talentBasePaste.toBuffer(), left: 0, top: 0},
            { input: await constBasePaste.toBuffer(), left: 0, top: 0},
            { input: await characterInfoPaste.toBuffer(), left: 0, top: 0},
            { input: await characterStatusPaste.toBuffer(), left: 0, top: 0},
            { input: await artifactScorePaste.toBuffer(), left: 0, top: 0},
            { input: await artifactPreviewPaste.toBuffer(), left: 0, top: 0},
            { input: await artifactStatusPaste.toBuffer(), left: 0, top: 0},
            { input: await setBonusPaste.toBuffer(), left: 0, top: 0 }
        ]
    ).toBuffer()
}



module.exports = { generate }
