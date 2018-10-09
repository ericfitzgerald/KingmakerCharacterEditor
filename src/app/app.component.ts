import { Component, ChangeDetectorRef } from '@angular/core';
import {Buffer} from 'buffer';
import { Blueprints } from './blueprints';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  player: any = {Money: null, m_EntityData: null};
  party: any = {m_EntityData: null};
  stats: string[] = ["Strength","Dexterity","Constitution","Intelligence","Wisdom","Charisma","Speed","Reach"];
  dialog = window['electron'].remote.dialog;
  fs = window['electron'].remote.require('fs');
  zip = window['zip'];
  filename: string;
  zipfile: any;

  constructor(private ref: ChangeDetectorRef){
  }

  openFile() {
    var options: any = {filters: [{name: 'Kingmaker Save File', extensions: ['zks'] }],
        properties: ['openFile','treatPackageAsDirectory', 'showHiddenFiles'],
        defaultPath: ''};
    if (window['process'].platform == 'win32')
      options.defaultPath = '%LOCALAPPDATA%\\..\\LocalLow\\Owlcat Games\\Pathfinder Kingmaker\\Saved Games\\'
    if (window['process'].platform == 'darwin')
      options.defaultPath = '~/Library/Application Support/unity.Owlcat Games.Pathfinder Kingmaker/Saved Games/';
    this.dialog.showOpenDialog(null,options, this.unzipAndParseFile);
  }

  saveFile() {
    this.zipfile.file('player.json',JSON.stringify(this.serializeReferences(this.player)));
    this.zipfile.file('party.json',JSON.stringify(this.serializeReferences(this.party)));
    var data = this.zipfile.generate({base64: false, compression: 'DEFLATE'});
    this.fs.writeFileSync(this.filename,data,'binary');
  }

  getName(character): string {
    if (character == null || character.Descriptor == null)
      return '';
    if (character.Descriptor.CustomName != null && character.Descriptor.CustomName != '')
      return character.Descriptor.CustomName;
    if (Blueprints.CharacterNames[character.Descriptor.Blueprint] != null)
      return Blueprints.CharacterNames[character.Descriptor.Blueprint];
    return character.Descriptor.Blueprint;
  }
  getClasses(character)  {
    let results = [];
    for(let _class of character.Descriptor.Progression.Classes){
        let blueprint = _class.CharacterClass;
        results.push(blueprint in Blueprints.Classes ? Blueprints.Classes[blueprint] : blueprint);
    }
    return results;
  }
  
  getRace(character)  {
    let blueprint = character.Descriptor.Progression.m_Race;
    return blueprint in Blueprints.Races ? Blueprints.Races[blueprint] : blueprint
  }
  getItems()  {
    let results = [];
    if(!this.party.m_EntityData) return results;
    for(let item of this.party.m_EntityData[0].Descriptor.m_Inventory.m_Items){
      let name = item.m_Blueprint in Blueprints.Items ? Blueprints.Items[item.m_Blueprint] : item.m_Blueprint
      results.push({name:name, count:item.m_Count});
    }
    return results;
  }

  getDoll(character){
    let results = [];
    if(!character.Descriptor.Doll) return results;
    for(let entry of character.Descriptor.Doll.EquipmentEntityIds ){
      results.push(entry in Blueprints.Doll ? Blueprints.Doll[entry] : entry);
    }
    for(let kv of character.Descriptor.Doll.EntityRampIdices ){
      let key = kv.Key in Blueprints.ColorKeys ? Blueprints.ColorKeys[kv.Key] : kv.Key;
      results.push('Prim: ' + key + ' : ' + kv.Value);
    }
    for(let kv of character.Descriptor.Doll.EntitySecondaryRampIdices ){
      let key = kv.Key in Blueprints.ColorKeys ? Blueprints.ColorKeys[kv.Key] : kv.Key;
      results.push('Sec: ' + key + ' : ' + kv.Value);
    }
    return results;
  }

  getVoice(character){
    if(character.Descriptor.CustomAsks in Blueprints.Voices){
      return Blueprints.Voices[character.Descriptor.CustomAsks];
    }
    return character.Descriptor.CustomAsks;
  }

  getPortrait(character){
    if(character.Descriptor.UISettings.m_CustomPortrait){
        //m_CustomPortraitId refers to the folder containing the custom portrait in the Portraits folder
        return "Custom " + character.Descriptor.UISettings.m_CustomPortrait.m_CustomPortraitId;
    } else if(character.Descriptor.UISettings.m_Portrait) {
      if(character.Descriptor.UISettings.m_Portrait in Blueprints.Portraits) {
        return Blueprints.Portraits[character.Descriptor.UISettings.m_Portrait];
      } else{
        return character.Descriptor.UISettings.m_Portrait;
      }
    } else {
      return "No Portrait";
    }
  }
  getFeatures(character)  {
    let results = [];
    for(let fact of character.Descriptor.Progression.Features.m_Facts){
        let blueprintHash = fact.Blueprint;
        results.push(this.getFeatByBlueprint(fact.Blueprint));
    }
    
    return results;
  }
  getProgressions(character)  {
    let results = [];
    for(let kv of character.Descriptor.Progression.m_Progressions){
      let value = kv.Value.Blueprint in Blueprints.Progressions ? Blueprints.Progressions[kv.Value.Blueprint] : kv.Value.Blueprint;
      value += ' - ' + kv.Value.Level;
      if(kv.Value.Archtypes) value += ' - ' + kv.Value.Archtypes;
      results.push(value);
    }
    return results;
  }
  getSelections(character)  {
    let results = [];
    for(let kv of character.Descriptor.Progression.m_Selections){
      for(let kv2 of kv.Value.m_SelectionsByLevel){
        let blueprintHash = kv2.Value[0];
        results.push(this.getFeatByBlueprint(blueprintHash));
      }
    }
    return results;
  }
  getFeatByBlueprint(blueprintHash): string {
    if(blueprintHash in Blueprints.Features) return Blueprints.Features[blueprintHash];
    return blueprintHash;
  }

  resetCharacter(character) {
    if(character == this.party.m_EntityData[0]){
      const baseStats = `{"$id":"5349","HitPoints":{"$id":"5350","m_BaseStat":"Constitution","m_Stats":{"$ref":"5349"},"m_BaseStatModifier":null,"Type":"HitPoints","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},"TemporaryHitPoints":{"$id":"5351","Type":"TemporaryHitPoints","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},"AC":{"$id":"5352","m_Stats":{"$ref":"5349"},"m_DexBonusLimiters":null,"m_DexBonus":{"$id":"5353","ModDescriptor":"DexterityBonus","StackMode":"Default","ModValue":0,"Source":null,"SourceComponent":null,"ItemSource":null},"Type":"AC","m_BaseValue":10,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":10,"PersistentModifierList":[{"$ref":"5353"},{"$id":"5354","ModDescriptor":"Size","StackMode":"Default","ModValue":0,"Source":null,"SourceComponent":null,"ItemSource":null}]},"AdditionalAttackBonus":{"$id":"5355","Type":"AdditionalAttackBonus","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":[{"$id":"5356","ModDescriptor":"Size","StackMode":"Default","ModValue":0,"Source":null,"SourceComponent":null,"ItemSource":null}]},"AdditionalDamage":{"$id":"5357","Type":"AdditionalDamage","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},"BaseAttackBonus":{"$id":"5358","Type":"BaseAttackBonus","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},"AttackOfOpportunityCount":{"$id":"5359","Type":"AttackOfOpportunityCount","m_BaseValue":1,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":1,"PersistentModifierList":null},"Speed":{"$id":"5360","Type":"Speed","m_BaseValue":30,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":30,"PersistentModifierList":null},"Charisma":{"$id":"5361","m_Disabled":{"$id":"5362","m_Count":0},"Type":"Charisma","m_BaseValue":10,"m_Dependents":[{"$id":"5363","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSkill, Assembly-CSharp","BaseStat":{"$ref":"5361"},"ClassSkill":{"$id":"5364","m_Count":0},"Type":"SkillPersuasion","m_BaseValue":0,"m_Dependents":[{"$id":"5365","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueDependant, Assembly-CSharp","BaseStat":{"$ref":"5363"},"Type":"CheckBluff","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},{"$id":"5366","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueDependant, Assembly-CSharp","BaseStat":{"$ref":"5363"},"Type":"CheckDiplomacy","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},{"$id":"5367","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueDependant, Assembly-CSharp","BaseStat":{"$ref":"5363"},"Type":"CheckIntimidate","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null}],"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},{"$id":"5368","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSkill, Assembly-CSharp","BaseStat":{"$ref":"5361"},"ClassSkill":{"$id":"5369","m_Count":0},"Type":"SkillUseMagicDevice","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null}],"m_DependentFacts":null,"PermanentValue":10,"PersistentModifierList":null},"AdditionalCMB":{"$id":"5370","Type":"AdditionalCMB","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},"AdditionalCMD":{"$id":"5371","Type":"AdditionalCMD","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},"Constitution":{"$id":"5372","m_Disabled":{"$id":"5373","m_Count":0},"Type":"Constitution","m_BaseValue":10,"m_Dependents":[{"$ref":"5350"},{"$id":"5374","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSavingThrow, Assembly-CSharp","BaseStat":{"$ref":"5372"},"Type":"SaveFortitude","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null}],"m_DependentFacts":null,"PermanentValue":10,"PersistentModifierList":null},"Dexterity":{"$id":"5375","m_Disabled":{"$id":"5376","m_Count":0},"Type":"Dexterity","m_BaseValue":10,"m_Dependents":[{"$ref":"5352"},{"$id":"5377","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSavingThrow, Assembly-CSharp","BaseStat":{"$ref":"5375"},"Type":"SaveReflex","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},{"$id":"5378","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSkill, Assembly-CSharp","BaseStat":{"$ref":"5375"},"ClassSkill":{"$id":"5379","m_Count":0},"Type":"SkillMobility","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},{"$id":"5380","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSkill, Assembly-CSharp","BaseStat":{"$ref":"5375"},"ClassSkill":{"$id":"5381","m_Count":0},"Type":"SkillThievery","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},{"$id":"5382","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSkill, Assembly-CSharp","BaseStat":{"$ref":"5375"},"ClassSkill":{"$id":"5383","m_Count":0},"Type":"SkillStealth","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":[{"$id":"5384","ModDescriptor":"Size","StackMode":"Default","ModValue":0,"Source":null,"SourceComponent":null,"ItemSource":null}]},{"$id":"5385","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueInitiative, Assembly-CSharp","m_Dexterity":{"$ref":"5375"},"m_DexBonus":{"$id":"5386","ModDescriptor":"DexterityBonus","StackMode":"Default","ModValue":0,"Source":null,"SourceComponent":null,"ItemSource":null},"Type":"Initiative","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":[{"$ref":"5386"}]}],"m_DependentFacts":null,"PermanentValue":10,"PersistentModifierList":null},"Intelligence":{"$id":"5387","m_Disabled":{"$id":"5388","m_Count":0},"Type":"Intelligence","m_BaseValue":10,"m_Dependents":[{"$id":"5389","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSkill, Assembly-CSharp","BaseStat":{"$ref":"5387"},"ClassSkill":{"$id":"5390","m_Count":0},"Type":"SkillKnowledgeArcana","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},{"$id":"5391","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSkill, Assembly-CSharp","BaseStat":{"$ref":"5387"},"ClassSkill":{"$id":"5392","m_Count":0},"Type":"SkillKnowledgeWorld","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null}],"m_DependentFacts":null,"PermanentValue":10,"PersistentModifierList":null},"Owner":{"$ref":"5"},"SaveFortitude":{"$ref":"5374"},"SaveReflex":{"$ref":"5377"},"SaveWill":{"$id":"5393","BaseStat":{"$id":"5394","m_Disabled":{"$id":"5395","m_Count":0},"Type":"Wisdom","m_BaseValue":10,"m_Dependents":[{"$ref":"5393"},{"$id":"5396","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSkill, Assembly-CSharp","BaseStat":{"$ref":"5394"},"ClassSkill":{"$id":"5397","m_Count":0},"Type":"SkillPerception","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},{"$id":"5398","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSkill, Assembly-CSharp","BaseStat":{"$ref":"5394"},"ClassSkill":{"$id":"5399","m_Count":0},"Type":"SkillLoreNature","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},{"$id":"5400","$type":"Kingmaker.EntitySystem.Stats.ModifiableValueSkill, Assembly-CSharp","BaseStat":{"$ref":"5394"},"ClassSkill":{"$id":"5401","m_Count":0},"Type":"SkillLoreReligion","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null}],"m_DependentFacts":null,"PermanentValue":10,"PersistentModifierList":null},"Type":"SaveWill","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},"SkillMobility":{"$ref":"5378"},"SkillAthletics":{"$id":"5402","BaseStat":{"$id":"5403","m_Disabled":{"$id":"5404","m_Count":0},"Type":"Strength","m_BaseValue":10,"m_Dependents":[{"$ref":"5402"}],"m_DependentFacts":null,"PermanentValue":10,"PersistentModifierList":null},"ClassSkill":{"$id":"5405","m_Count":0},"Type":"SkillAthletics","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},"SkillKnowledgeArcana":{"$ref":"5389"},"SkillLoreNature":{"$ref":"5398"},"SkillPerception":{"$ref":"5396"},"SkillThievery":{"$ref":"5380"},"Strength":{"$ref":"5403"},"Wisdom":{"$ref":"5394"},"Initiative":{"$ref":"5385"},"SkillPersuasion":{"$ref":"5363"},"SkillStealth":{"$ref":"5382"},"SkillUseMagicDevice":{"$ref":"5368"},"SkillLoreReligion":{"$ref":"5400"},"SkillKnowledgeWorld":{"$ref":"5391"},"CheckBluff":{"$ref":"5365"},"CheckDiplomacy":{"$ref":"5366"},"CheckIntimidate":{"$ref":"5367"},"SneakAttack":{"$id":"5406","Type":"SneakAttack","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":null},"Reach":{"$id":"5407","Type":"Reach","m_BaseValue":0,"m_Dependents":null,"m_DependentFacts":null,"PermanentValue":0,"PersistentModifierList":[{"$id":"5408","ModDescriptor":"Size","StackMode":"Default","ModValue":5,"Source":null,"SourceComponent":null,"ItemSource":null}]}}`;
      let descriptor = character.Descriptor;
      descriptor.Blueprint = "4391e8b9afbb0cf43aeba700c089f56d"; //Use custom character build
      if(descriptor.UISettings.m_Portrait == null) descriptor.UISettings.m_Portrait = "1bc4682bdcb12234fb270ef573877b6c"; //for prebuild character, portrait dissapears
      descriptor.Abilities.m_Facts = []; 
      descriptor.ActivatableAbilities.m_Facts = [];
      descriptor.Buffs.m_Facts = [];
      descriptor.Proficiencies.m_ArmorProficiencies.m_Data = [];
      descriptor.Proficiencies.m_WeaponProficiencies.m_Data = [];
      descriptor.Progression.characterLevel = 0;
      descriptor.Progression.ClassSkills = [];
      descriptor.Progression.Classes = [];
      descriptor.Progression.Features.m_Facts = [];
      descriptor.Progression.TotalIntelligenceSkillPoints = 0;
      descriptor.Progression.m_LevelPlans = [];
      descriptor.Progression.m_Progressions = [];
      descriptor.Progression.m_Selections = [];
      descriptor.Resources.PersistantResources = [];
      descriptor.UISettings.Slots = null;
      descriptor.UISettings.m_AlreadyAutomaniclyAdded = []; 
      //descriptor.Doll = null; //Don't reset doll because it looks weird if character is female
      descriptor.m_Spellbooks = [];
      descriptor.Stats = this.resolveReferences(baseStats);
      this.recursiveBumpStatIds(descriptor.Stats);
      descriptor.Stats.Owner = descriptor;
    } else {
        //Completly resets character, including stats, experience, alignment history and inventory.
        //If it is the main character, it also resets the shared inventory!!!
        //For companions, it resets to the state when they joined
      character.Descriptor.Recreate = true;
    }
  }
  recursiveBumpStatIds(parent, seen?) {
    const bumpByNumber = 100000;
    if(!seen) {
      seen = [parent];
      if('$id' in parent) parent.$id = parent.$id + bumpByNumber;
    }
    for(let key in parent){
      let child = parent[key];
      if(seen.indexOf(child) >= 0 || typeof child !== 'object' || !child) continue;
      if('$id' in child) child.$id = child.$id + bumpByNumber;
      seen.push(child);
      this.recursiveBumpStatIds(child, seen);
    }
  };

  getAlignmentString(vector): string {
    var angle = Math.atan2(vector.y, vector.x) * 180 / Math.PI; //CCW Angle starting east
    if(angle < 0) angle += 360;
    angle -= 22.5 //let 0-45 equal chaotic good and -22.5-0 and 315-337.5 equal Chaotic Neutral
    let radius = Math.sqrt(vector.x * vector.x + vector.y + vector.y);
    if(radius <= 0.4) return "Neutral";
    if(angle >= 0 && angle < 45) return "Chaotic Good";
    if(angle >= 45 && angle < 90) return "Neutral Good";
    if(angle >= 90 && angle < 135) return "Lawful Good";
    if(angle >= 135 && angle < 180) return "Lawful Netural";
    if(angle >= 180 && angle < 225) return "Lawful Evil";
    if(angle >= 225 && angle < 270) return "Netural Evil";
    if(angle >= 270 && angle < 315) return "Chaotic Evil";
    return "Chaotic Neutral";
  }
  
  getAlignmentVector(name): any {
    let alignments = {
      "Neutral" : {"x" : 0, "y": 0},
      "Chaotic Good" : {"x" : 0.707106769, "y": 0.707106769},
      "Neutral Good" : {"x" : 0, "y": 1},
      "Lawful Good" : {"x" : -0.707106769, "y": 0.707106769},
      "Lawful Neutral" : {"x" : -1, "y": 0},
      "Lawful Evil" : {"x" : -0.707106769, "y": -0.707106769},
      "Neutral Evil" : {"x" : 0, "y": -1},
      "Chaotic Evil" : {"x" : 0.707106769, "y": -0.707106769},
      "Chaotic Neutral" : {"x" : 1, "y": 0},
    }
    return alignments[name];
  }

  serializeReferences(obj, references?) {
    var clone = {};
    if (Array.isArray(obj))
      clone = [];
    if (references == null)
      references = [];
    if (obj.$id != null)
      references.push(obj.$id);
    for(var i in obj) {
      if(obj[i] != null &&  typeof(obj[i])=="object") {
        if (obj[i].$id != null && references.includes(obj[i].$id))
          clone[i] = {$ref: obj[i].$id}
        else {
          clone[i] = this.serializeReferences(obj[i], references);
        }
      } else
        clone[i] = obj[i];
    }
    return clone;
  }

  unzipAndParseFile = (fileNames) => {
    if (fileNames === undefined) return;
    this.filename = fileNames[0];
    var data = this.fs.readFileSync(this.filename, 'binary');
    this.zipfile = new this.zip(data);
    var partyString = this.zipfile.files['party.json'].asText();
    if (partyString.charCodeAt(0) == 65279)
      partyString = partyString.substring(1);
    this.party = this.resolveReferences(partyString);
    var playerString = this.zipfile.files['player.json'].asText();
    if (playerString.charCodeAt(0) == 65279)
      playerString = playerString.substring(1);
    this.player = this.resolveReferences(playerString);
    window['party'] = this.party;
    window['app'] = this;
    window['blueprints'] = Blueprints;
    //this.ref.markForCheck();
    this.ref.detectChanges();
  }

  resolveReferences(json) {
    if (typeof json === 'string')
      json = JSON.parse(json);
    var byid = {}, // all objects by id
    refs = []; // references to objects that could not be resolved
    json = (function recurse(obj, prop?, parent?) {
      if (typeof obj !== 'object' || !obj) // a primitive value
        return obj;
      if ("$ref" in obj) { // a reference
        var ref = obj.$ref;
        if (ref in byid)
            return byid[ref];
        // else we have to make it lazy:
        refs.push([parent, prop, ref]);
        return;
      } else if ("$id" in obj) {
        if (obj.$id in byid)
          return obj;
        var id = obj.$id;
        byid[id] = obj;
        if ("$values" in obj) // an array
            obj = obj.$values.map(recurse);
        else // a plain object
            for (var newprop in obj)
                obj[newprop] = recurse(obj[newprop], newprop, obj)
      } else if (Array.isArray(obj)) {
        obj = obj.map(recurse);
      } else {
        for (var newprop in obj)
                obj[newprop] = recurse(obj[newprop], newprop, obj)
      }
      return obj;
    })(json); // run it!

    for (var i=0; i<refs.length; i++) { // resolve previously unknown references
      var ref = refs[i];
      ref[0][ref[1]] = byid[refs[2]];
      // Notice that this throws if you put in a reference at top-level
    }
    return json;
  }
}