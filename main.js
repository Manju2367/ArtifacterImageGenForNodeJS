"use strict"

const path = require("path")
const { EnkaClient, Character, Artifact } = require("enka-network-api")
const sharp = require("sharp")
const Jimp = require("jimp")
const { text2image, roundedRect, mask, createImage, composite } = require("./imgUtil")
const { exit } = require("process")

const testPath = path.join(__dirname, "test")
const assetsPath = path.join(__dirname, "assets")
const fontPath = path.join(assetsPath, "ja-jp.ttf")
const basePath = path.join(__dirname, "base")
const characterPath = path.join(__dirname, "character")
const weaponPath = path.join(__dirname, "weapon")
const constellationPath = path.join(__dirname, "constellation")
const emotePath = path.join(__dirname, "emotes")
const artifactGradePath = path.join(__dirname, "artifactGrades")
const artifactPath = path.join(__dirname, "artifact")

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
const generate = async (character, calcType="atk") => {
    // キャラクター
    const characterElement          = character.characterData.element.name.get("jp").charAt(0)
    const characterName             = character.characterData.name.get("jp") === "旅人" ?
                                      (character.characterData.gender === "MALE" ? `空(${ characterElement })` : `蛍(${ characterElement })`) :
                                      character.characterData.name.get("jp")
    const characterStatus           = character.status
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
        name: characterStatus.pyroDamage.type.get("jp"),
        value: Math.round(characterStatus.pyroDamage.getFormattedValue() * 10) / 10
    }
    const characterHydroDamage      = {
        name: characterStatus.hydroDamage.type.get("jp"),
        value: Math.round(characterStatus.hydroDamage.getFormattedValue() * 10) / 10
    }
    const characterCryoDamage       = {
        name: characterStatus.cryoDamage.type.get("jp"),
        value: Math.round(characterStatus.cryoDamage.getFormattedValue() * 10) / 10
    }
    const characterElectroDamage    = {
        name: characterStatus.electroDamage.type.get("jp"),
        value: Math.round(characterStatus.electroDamage.getFormattedValue() * 10) / 10
    }
    const characterDendroDamage     = {
        name: characterStatus.dendroDamage.type.get("jp"),
        value: Math.round(characterStatus.dendroDamage.getFormattedValue() * 10) / 10
    }
    const characterAnemoDamage      = {
        name: characterStatus.anemoDamage.type.get("jp"),
        value: Math.round(characterStatus.anemoDamage.getFormattedValue() * 10) / 10
    }
    const characterGeoDamage        = {
        name: characterStatus.geoDamage.type.get("jp"),
        value: Math.round(characterStatus.geoDamage.getFormattedValue() * 10) / 10
    }
    const characterPhysicalDamage   = {
        name: characterStatus.physicalDamage.type.get("jp"),
        value: Math.round(characterStatus.physicalDamage.getFormattedValue() * 10) / 10
    }
    const characterHealAdd          = {
        name: characterStatus.healAdd.type.get("jp"),
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
                                      weapon.weaponStats[1].type.get("jp") :
                                      undefined
    const weaponSubStatusValue      = weapon.weaponStats[1] ?
                                      weapon.weaponStats[1].isPercent ?
                                      weapon.weaponStats[1].getFormattedValue().toFixed(1) :
                                      weapon.weaponStats[1].getFormattedValue().toFixed() :
                                      undefined
    const weaponSubStatusType       = weapon.weaponStats[1] ?
                                      weapon.weaponStats[1].type.get("jp") :
                                      undefined

    // 聖遺物
    const artifacts                 = character.artifacts
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
    let characterImage = sharp(path.join(characterPath, characterName, "splashImage.png"))
        .extract({
            left: 289,
            top: 0,
            width: 1728 - 289,
            height: 1024
        })
        .resize(Math.floor((1728 - 289) * 0.75), Math.floor(1024 * 0.75))
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

    let weaponNameImage = text2image(weaponName, {
        fontLocation: fontPath,
        fontSize: 26,
        fontColor: "#FFF"
    })
    let weaponLevelImage = text2image(`Lv.${ weaponLevel }`, {
        fontLocation: fontPath,
        fontSize: 24,
        fontColor: "#FFF"
    })
    let rectWeaponLevel = roundedRect(0, 0, (await weaponLevelImage.metadata()).width + 4, 28, 1)
    

    let baseAttackIcon = sharp(path.join(emotePath, "基礎攻撃力.png"))
        .resize(23, 23)
    let weaponBaseAttackImage = text2image(`基礎攻撃力  ${ weaponBaseAtk }`, {
        fontLocation: fontPath,
        fontSize: 23,
        fontColor: "#FFF"
    })

    let rectWeaponRank = roundedRect(0, 0, 40, 25, 1)
    let weaponRankImage = text2image(`R${ weaponRank }`, {
        fontLocation: fontPath,
        fontSize: 24,
        fontColor: "#FFF"
    })

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
        let weaponSubStatusImage = text2image(`${ Object.keys(statusNameMap).includes(weaponSubStatusName) ? statusNameMap[weaponSubStatusName].short : weaponSubStatusName }  ${ weaponSubStatusValue }${ weapon.weaponStats[1].isPercent ? "%" : "" }`, {
            fontLocation: fontPath,
            fontSize: 23,
            fontColor: "#FFF"
        })

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
    let characterNameImage = text2image(characterName, {
        fontLocation: fontPath,
        fontSize: 48,
        fontColor: "#FFF"
    })
    let characterLevelImage = text2image(`Lv.${ characterLevel }`, {
        fontLocation: fontPath,
        fontSize: 25,
        fontColor: "#FFF"
    })
    let friendshipImage = text2image(`${ characterFriendship }`, {
        fontLocation: fontPath,
        fontSize: 25,
        fontColor: "#FFF"
    })
    let rectFriendShip = roundedRect(
        35 + (await characterLevelImage.metadata()).width + 5, 
        74, 
        77 + (await characterLevelImage.metadata()).width + (await friendshipImage.metadata()).width, 
        102, 
        2
    )
    let friendshipIcon = sharp(path.join(assetsPath, "Love.png"))
    friendshipIcon.resize(Math.floor((await friendshipIcon.metadata()).width * (24 / (await friendshipIcon.metadata()).height)), 24, { fit: "fill" })

    let normalAttackLevelImage = text2image(`Lv.${ characterTalent.normalAttack }`, {
        fontLocation: fontPath,
        fontSize: 17,
        fontColor: characterTalent.normalAttack >= 10 ? "#0FF" : "#FFF"
    })
    let elementalSkillLevelImage = text2image(`Lv.${ characterTalent.elementalSkill }`, {
        fontLocation: fontPath,
        fontSize: 17,
        fontColor: characterTalent.elementalSkill >= 10 ? "#0FF" : "#FFF"
    })
    let elementalBurstLevelImage = text2image(`Lv.${ characterTalent.elementalBurst }`, {
        fontLocation: fontPath,
        fontSize: 17,
        fontColor: characterTalent.elementalBurst >= 10 ? "#0FF" : "#FFF"
    })

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
    let baseHealthImage = text2image(characterBaseHealth, {
        fontLocation: fontPath,
        fontSize: 12,
        fontColor: "#FFF"
    })
    let addHealthImage = text2image(`+${ characterAddHealth }`, {
        fontLocation: fontPath,
        fontSize: 12,
        fontColor: "#0F0"
    })
    let maxHealthImage = text2image(characterMaxHealth, {
        fontLocation: fontPath,
        fontSize: 26,
        fontColor: "#FFF"
    })

    // 攻撃力
    let baseAttackImage = text2image(characterBaseAttack, {
        fontLocation: fontPath,
        fontSize: 12,
        fontColor: "#FFF"
    })
    let addAttackImage = text2image(`+${ characterAddAttack }`, {
        fontLocation: fontPath,
        fontSize: 12,
        fontColor: "#0F0"
    })
    let attackImage = text2image(characterAttack, {
        fontLocation: fontPath,
        fontSize: 26,
        fontColor: "#FFF"
    })

    // 防御力
    let baseDefenseImage = text2image(characterBaseDefense, {
        fontLocation: fontPath,
        fontSize: 12,
        fontColor: "#FFF"
    })
    let addDefenseImage = text2image(`+${ characterAddDefense }`, {
        fontLocation: fontPath,
        fontSize: 12,
        fontColor: "#0F0"
    })
    let defenseImage = text2image(characterDefense, {
        fontLocation: fontPath,
        fontSize: 26,
        fontColor: "#FFF"
    })

    // 元素熟知
    let elementMasteryImage = text2image(characterElementMastery, {
        fontLocation: fontPath,
        fontSize: 26,
        fontColor: "#FFF"
    })

    // 会心率
    let critRateImage = text2image(`${ characterCritRate }%`, {
        fontLocation: fontPath,
        fontSize: 26,
        fontColor: "#FFF"
    })

    // 会心ダメージ
    let critDamageImage = text2image(`${ characterCritDamage }%`, {
        fontLocation: fontPath,
        fontSize: 26,
        fontColor: "#FFF"
    })

    // 元素チャージ効率
    let chargeEfficiencyImage = text2image(`${ characterChargeEfficiency }%`, {
        fontLocation: fontPath,
        fontSize: 26,
        fontColor: "#FFF"
    })

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

        let maxValueStatusNameImage = text2image(characterMaxValueStatus.name, {
            fontLocation: fontPath,
            fontSize: 27,
            fontColor: "#FFF"
        })

        let maxValueStatusImage = text2image(`${ characterMaxValueStatus.value.toFixed(1) }%`, {
            fontLocation: fontPath,
            fontSize: 26,
            fontColor: "#FFF"
        })

        characterStatusPasteList.push(
            { input: await maxValueStatusIcon.toBuffer(), left: 787, top: 62 + 70*7 },
            { input: await maxValueStatusNameImage.toBuffer(), left: 845, top: 67 + 70*7 },
            { input: await maxValueStatusImage.toBuffer(), left: 1360 - (await maxValueStatusImage.metadata()).width, top: 67 + 70*7 }
        )
    }

    characterStatusPaste.composite(characterStatusPasteList)



    // 合計スコア
    let artifactScorePaste = createImage(baseSize.width, baseSize.height)

    let scoreTotalImage = text2image(scoreTotal.toFixed(1), {
        fontLocation: fontPath,
        fontSize: 75,
        fontColor: "#FFF"
    })
    let convAsImage = text2image(`${ convAsMap[calcType] }換算`, {
        fontLocation: fontPath,
        fontSize: 24,
        fontColor: "#FFF"
    })

    let scoreBadge
    if(scoreTotal >= 220) {
        scoreBadge = sharp(path.join(artifactGradePath, "SS.png"))
    } else if(scoreTotal >= 200) {
        scoreBadge = sharp(path.join(artifactGradePath, "S.png"))
    } else if(scoreTotal >= 180) {
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
        let artifactMask = sharp(path.join(assetsPath, "ArtifactMask.png"))
            .resize(332, 332)
        let artifactImage = sharp(path.join(artifactPath, artifacts[i].artifactData.set.name.get("jp"), `${ artifactTypeMap[artifacts[i].artifactData.equipType] }.png`))
            .resize(332, 332)
            .modulate({
                brightness: 0.6
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
        let mainOpName = mainStatus.type.get("jp")
        let mainOpValue = mainStatus.isPercent ? 
                          mainStatus.getFormattedValue().toLocaleString(undefined, { maximumFractionDigits: 1 }) :
                          mainStatus.getFormattedValue().toLocaleString()

        let mainOpIcon = sharp(path.join(emotePath, `${ Object.keys(statusNameMap).includes(mainOpName) && mainStatus.isPercent ? statusNameMap[mainOpName].long : mainOpName }.png`))
            .resize(35, 35)
        let mainOpNameImage = text2image(Object.keys(statusNameMap).includes(mainOpName) && mainStatus.isPercent ? statusNameMap[mainOpName].short : mainOpName, {
            fontLocation: fontPath,
            fontSize: 29,
            fontColor: "#FFF"
        })
        let mainOpValueImage = text2image(`${ mainOpValue }${ mainStatus.isPercent ? "%" : "" }` ,{
            fontLocation: fontPath,
            fontSize: 49,
            fontColor: "#FFF"
        })

        artifactStatusPaste = await composite(artifactStatusPaste, mainOpIcon, 340 + i*373 - (await mainOpNameImage.metadata()).width, 655)
        artifactStatusPaste = await composite(artifactStatusPaste, mainOpNameImage, 375 + i*373 - (await mainOpNameImage.metadata()).width, 655)
        artifactStatusPaste = await composite(artifactStatusPaste, mainOpValueImage, 375 + i*373 - (await mainOpValueImage.metadata()).width, 690)

        // サブOP
        // artifact.substats.total.forEach(subStatus => {

        // })
    }



    // 合成
    base
        .composite(
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
                { input: await artifactStatusPaste.toBuffer(), left: 0, top: 0}
            ]
        )
        .toFile(path.join(testPath, "test.png"))
        .then((info) => {
            console.log("Generated image.")
            exit(1)
        })
        .catch((err) => {
            console.log(err)
        })
}

enka.fetchUser("800282666").then(result => {
    generate(result.characters[0])
})
