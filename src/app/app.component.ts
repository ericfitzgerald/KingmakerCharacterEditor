import { Component, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import {Buffer} from 'buffer';
import { Blueprints } from './blueprints';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  player: any = {Money: null, m_EntityData: null};
  party: any = {m_EntityData: null};
  stats: string[] = ['Strength', 'Dexterity', 'Constitution', 'Intelligence', 'Wisdom', 'Charisma', 'Speed', 'Reach'];
  dialog = window['electron'].remote.dialog;
  fs = window['electron'].remote.require('fs');
  path = window['electron'].remote.require('path');
  zip = window['zip'];
  filename: string;
  zipfile: any;
  constructor(private ref: ChangeDetectorRef) {
    setInterval(() => {this.ref.markForCheck(); }, 750); // You need this for the UI to update properly
  }

  openFile() {
    const options: any = {filters: [{name: 'Kingmaker Save File', extensions: ['zks'] }],
        properties: ['openFile', 'treatPackageAsDirectory', 'showHiddenFiles'],
        defaultPath: ''};
    switch (window['process'].platform) {
      case 'win32':
        options.defaultPath = '%LOCALAPPDATA%\\..\\LocalLow\\Owlcat Games\\Pathfinder Kingmaker\\Saved Games\\';
        break;
      case 'darwin':
        options.defaultPath = '~/Library/Application Support/unity.Owlcat Games.Pathfinder Kingmaker/Saved Games/';
        break;
      case 'linux':
        options.defaultPath = '~/.config/unity3d/Owlcat Games/Pathfinder Kingmaker/Saved Games';
        break;
    }
    this.dialog.showOpenDialog(null, options, this.unzipAndParseFile);
  }

  saveFile() {
    this.zipfile.file('player.json', JSON.stringify(this.serializeReferences(this.player)));
    this.zipfile.file('party.json', JSON.stringify(this.serializeReferences(this.party)));
    const data = this.zipfile.generate({base64: false, compression: 'DEFLATE'});
    this.fs.writeFileSync(this.filename, data, 'binary');
  }
  getObjectBlueprint(object): string {
    // @nb: Sometimes obects, if not a real full object have filed named Blueprint. Wrapper to avoid checking everytime it can be needed.
    if (object === null)  { return ''; }
    if (object.hasOwnProperty('Blueprint')) {return object.Blueprint; }
    return object.hasOwnProperty('m_Blueprint') ? object.m_Blueprint : '';
  }
  getName(character): string {
    // @nb: Items field Wielder is a Descriptor
    if (character == null) {
      return '';
    }
    const descr = character.hasOwnProperty('Descriptor') ? character.Descriptor : character;

    if (descr.hasOwnProperty('CustomName') && descr.CustomName != null && descr.CustomName !== '') {
      return descr.CustomName;
    }
    const bp = this.getObjectBlueprint(descr);
    return (Blueprints.CharacterNames[bp] != null) ? Blueprints.CharacterNames[bp] : bp;
  }
  getClasses(character)  {
    const results = [];
    for (const _class of character.Descriptor.Progression.Classes) {
        const blueprint = _class.CharacterClass;
        results.push(blueprint in Blueprints.Classes ? Blueprints.Classes[blueprint] : blueprint);
    }
    return results;
  }

  getRace(character)  {
    const blueprint = character.Descriptor.Progression.m_Race;
    return blueprint in Blueprints.Races ? Blueprints.Races[blueprint] : blueprint;
  }
  findBlueprintItem(itemName: string): string {
    // @todo: search in translation file for missing items names
    return (itemName in Blueprints.Items ? Blueprints.Items[itemName] : itemName);
  }

  getDoll(character) {
    const results = [];
    if (!character.Descriptor.Doll) { return results; }
    for (const entry of character.Descriptor.Doll.EquipmentEntityIds ) {
      results.push(entry in Blueprints.Doll ? Blueprints.Doll[entry] : entry);
    }
    for (const kv of character.Descriptor.Doll.EntityRampIdices ) {
      const key = kv.Key in Blueprints.ColorKeys ? Blueprints.ColorKeys[kv.Key] : kv.Key;
      results.push('Prim: ' + key + ' : ' + kv.Value);
    }
    for (const kv of character.Descriptor.Doll.EntitySecondaryRampIdices ) {
      const key = kv.Key in Blueprints.ColorKeys ? Blueprints.ColorKeys[kv.Key] : kv.Key;
      results.push('Sec: ' + key + ' : ' + kv.Value);
    }
    return results;
  }

  getVoice(character) {
    if (character.Descriptor.CustomAsks in Blueprints.Voices) {
      return Blueprints.Voices[character.Descriptor.CustomAsks];
    }
    return character.Descriptor.CustomAsks;
  }

  getPortrait(character) {
    if (character.Descriptor.UISettings.m_CustomPortrait) {
        // m_CustomPortraitId refers to the folder containing the custom portrait in the Portraits folder
        return 'Custom ' + character.Descriptor.UISettings.m_CustomPortrait.m_CustomPortraitId;
    } else if (character.Descriptor.UISettings.m_Portrait) {
      if (character.Descriptor.UISettings.m_Portrait in Blueprints.Portraits) {
        return Blueprints.Portraits[character.Descriptor.UISettings.m_Portrait];
      } else {
        return character.Descriptor.UISettings.m_Portrait;
      }
    } else {
      return 'No Portrait';
    }
  }
  getFeatures(character)  {
    const results = [];
    for (const fact of character.Descriptor.Progression.Features.m_Facts) {
        const blueprintHash = fact.Blueprint;
        results.push(this.getFeatByBlueprint(fact.Blueprint));
    }

    return results;
  }
  getProgressions(character)  {
    const results = [];
    for (const kv of character.Descriptor.Progression.m_Progressions) {
      let value = kv.Value.Blueprint in Blueprints.Progressions ? Blueprints.Progressions[kv.Value.Blueprint] : kv.Value.Blueprint;
      value += ' - ' + kv.Value.Level;
      if (kv.Value.Archtypes) { value += ' - ' + kv.Value.Archtypes; }
      results.push(value);
    }
    return results;
  }
  getSelections(character)  {
    const results = [];
    for (const kv of character.Descriptor.Progression.m_Selections) {
      for (const kv2 of kv.Value.m_SelectionsByLevel) {
        const blueprintHash = kv2.Value[0];
        results.push(this.getFeatByBlueprint(blueprintHash));
      }
    }
    return results;
  }
  getFeatByBlueprint(blueprintHash): string {
    if (blueprintHash in Blueprints.Features) { return Blueprints.Features[blueprintHash]; }
    return blueprintHash;
  }
  chooseCharacterResetTemplate(character) {
    const options = {filters: [{name: 'Kingmaker Save File', extensions: ['json'] }],
        properties: ['openFile', 'treatPackageAsDirectory', 'showHiddenFiles'],
        defaultPath: this.path.join(window['process'].cwd(), 'templates') };
    this.dialog.showOpenDialog(null, options, (filepaths) => {
      if (filepaths != null && filepaths.length > 0) { this.resetCharacterFromTemplate(character, filepaths[0]); }
    });
  }
  readFile(path: string): string {
    return this.fs.readFileSync(path, {encoding: 'utf8'});
  }
  resetCharacterFromTemplate(character, filepath) {
    const descriptor = character.Descriptor;
    const _template = this.resolveReferences(this.readFile(filepath));
    const recurseiveReplace = (parent, template, owner, seen?) => {
      if (seen == null) { seen = new Set([parent]); }
      for (const key in parent) {
        const child = parent[key];
        if (child === template) { parent[key] = owner; }
        if (!seen.has(child)) {
          seen.add(child);
          recurseiveReplace(child, template, owner, seen);
        }
      }
    };
    this.recursiveBumpStatIds(_template);
    recurseiveReplace(_template, _template, descriptor);
    descriptor.Abilities.m_Facts = _template.Abilities;
    descriptor.ActivatableAbilities.m_Facts = _template.ActivatableAbilities;
    descriptor.Buffs.m_Facts = [];
    descriptor.Progression.CharacterLevel = _template.CharacterLevel;
    descriptor.Progression.ClassSkills = _template.ClassSkills;
    descriptor.Progression.Classes = _template.Classes;
    descriptor.Progression.Features.m_Facts = _template.Features;
    descriptor.Progression.TotalIntelligenceSkillPoints = _template.TotalIntelligenceSkillPoints;
    descriptor.Progression.m_LevelPlans = _template.m_LevelPlans;
    descriptor.Progression.m_Progressions = _template.m_Progressions;
    descriptor.Progression.m_Selections = _template.m_Selections;
    descriptor.Resources.PersistantResources = _template.PersistantResources;
    descriptor.UISettings.Slots = _template.Slots;
    descriptor.UISettings.m_AlreadyAutomaniclyAdded = _template.m_AlreadyAutomaniclyAdded;
    descriptor.m_Spellbooks = _template.m_Spellbooks;
    descriptor.Stats = _template.Stats;
    this.resetSpellbooks(descriptor, _template.m_Spellbooks);
  }

  resetSpellbooks(descriptor, newSpellbooks) {
    const oldSpellbooks = [];
    const scrollBasedSpellbooks = {
      '027d37761f3804042afa96fe3e9086cc': 'AlchemistSpellbook',
      '5d8d04e76dff6c5439de99af0d57be63': 'MagusSpellbook',
      '682545e11e5306c45b14ca78bcbe3e62': 'SwordSaintSpellbook',
      '4f96fb20f06b7494a8b2bd731a70af6c': 'EldritchScoundrelSpellbook',
      '5a38c9ac8607890409fcb8f6342da6f4': 'WizardSpellbook',
      '58b15cc36ceda8942a7a29aafa755452': 'ThassilonianAbjurationSpellbook',
      'cbc30bcc7b8adec48a53a6540f5596ae': 'ThassilonianConjurationSpellbook',
      '9e4b96d7b02f8c8498964aeee6eaef9b': 'ThassilonianEnchantmentSpellbook',
      '05b105ddee654db4fb1547ba48ffa160': 'ThassilonianEvocationSpellbook',
      '74b87962a97d56c4583979216631eb4c': 'ThassilonianIllusionSpellbook',
      '97cd3941ce333ce46ae09436287ed699': 'ThassilonianNecromancySpellbook',
      '5785f40e7b1bfc94ea078e7156aa9711': 'ThassilonianTransmutationSpellbook',
    };
    for (const kv of descriptor.m_Spellbooks) {
      if (kv.Key in scrollBasedSpellbooks) {
        oldSpellbooks.push(kv.Value);
      }
    }
    descriptor.m_Spellbooks = newSpellbooks;
    // Add in old spells
    for (const oldSpellbook of oldSpellbooks) {
      // If template doesn't contain old spellbook, add it
      if ( descriptor.m_Spellbooks.find(kv => kv.Key === oldSpellbook.Blueprint) == null) {
        descriptor.m_Spellbooks.push({
          Key: oldSpellbook.Blueprint,
          Value: oldSpellbook
        });
        oldSpellbook.m_CasterLevelInternal = 0;
        for (let i = 0; i < oldSpellbook.m_KnownSpells.length; i++) {
          oldSpellbook.m_CustomSpells[i] = [];
          oldSpellbook.m_MemorizedSpells[i] = [];
        }
      }
      const spellbook = descriptor.m_Spellbooks.find(kv => kv.Key === oldSpellbook.Blueprint).Value;
      for (const i of oldSpellbook.m_KnownSpells) {
        for (const oldSpell of oldSpellbook.m_KnownSpells[i]) {
          if (spellbook.m_KnownSpells[i].find(spell => spell.Blueprint === oldSpell.Blueprint) == null) {
            spellbook.m_KnownSpells[i].push(oldSpell);
          }
        }
      }
    }
    for (const feature of descriptor.Progression.Features.m_Facts) { // Link Linzi ring to feature
      if (feature.SourceItem != null) {
        for (const item of descriptor.m_Inventory.m_Items) {
          if (item.m_Blueprint === feature.SourceItem) {
            feature.SourceItem = item;
          }
        }
      }
    }
  }
  resetCharacter(character) {
    if (character.Descriptor.Blueprint in Blueprints.CharacterNames) {
      this.resetCharacterFromTemplate(character, 'templates/' +
        Blueprints.CharacterNames[character.Descriptor.Blueprint] + '_template.json');
    } else {
        const baseStats = this.readFile('templates/BaseStats.json');
        const descriptor = character.Descriptor;
        // Use custom character build for main character
        if (descriptor === this.party.m_EntityData[0].Descriptor) { descriptor.Blueprint = '4391e8b9afbb0cf43aeba700c089f56d'; }
        // for prebuild character, portrait dissapears
        if (descriptor.UISettings.m_Portrait == null) { descriptor.UISettings.m_Portrait = '1bc4682bdcb12234fb270ef573877b6c'; }
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
        // descriptor.Doll = null; // Don't reset doll because it looks weird if character is female
        descriptor.Stats = this.resolveReferences(baseStats);
        this.resetSpellbooks(descriptor, []);
        this.recursiveBumpStatIds(descriptor.Stats);
        descriptor.Stats.Owner = descriptor;
      }
  }
  recursiveBumpStatIds(parent, seen?) {
    const bumpByNumber = 1000000000 + Math.floor(Math.random() * 1000000000); // TODO: ensure ids are unique within savefile
    if (!seen) {
      seen = [parent];
      if ('$id' in parent) { parent.$id = parent.$id + bumpByNumber; }
    }
    for (const key in parent) {
      const child = parent[key];
      if (seen.indexOf(child) >= 0 || typeof child !== 'object' || !child) { continue; }
      if ('$id' in child) { child.$id = child.$id + bumpByNumber; }
      seen.push(child);
      this.recursiveBumpStatIds(child, seen);
    }
  }

  getAlignmentString(vector): string {
    let angle = Math.atan2(vector.y, vector.x) * 180 / Math.PI; // CCW Angle starting east
    if (angle < 0) { angle += 360; }
    angle -= 22.5; // let 0-45 equal chaotic good and -22.5-0 and 315-337.5 equal Chaotic Neutral
    const radius = Math.sqrt(vector.x * vector.x + vector.y + vector.y);
    if (radius <= 0.4) { return 'Neutral'; }
    if (angle >= 0 && angle < 45) { return 'Chaotic Good'; }
    if (angle >= 45 && angle < 90) { return 'Neutral Good'; }
    if (angle >= 90 && angle < 135) { return 'Lawful Good'; }
    if (angle >= 135 && angle < 180) { return 'Lawful Netural'; }
    if (angle >= 180 && angle < 225) { return 'Lawful Evil'; }
    if (angle >= 225 && angle < 270) { return 'Netural Evil'; }
    if (angle >= 270 && angle < 315) { return 'Chaotic Evil'; }
    return 'Chaotic Neutral';
  }

  getAlignmentVector(name): any {
    const alignments = {
      'Neutral' : {'x' : 0, 'y': 0},
      'Chaotic Good' : {'x' : 0.707106769, 'y': 0.707106769},
      'Neutral Good' : {'x' : 0, 'y': 1},
      'Lawful Good' : {'x' : -0.707106769, 'y': 0.707106769},
      'Lawful Neutral' : {'x' : -1, 'y': 0},
      'Lawful Evil' : {'x' : -0.707106769, 'y': -0.707106769},
      'Neutral Evil' : {'x' : 0, 'y': -1},
      'Chaotic Evil' : {'x' : 0.707106769, 'y': -0.707106769},
      'Chaotic Neutral' : {'x' : 1, 'y': 0},
    };
    return alignments[name];
  }

  serializeReferences(obj, references?) {
    let clone = {};
    if (Array.isArray(obj)) {
      clone = [];
    }
    if (references == null) {
      references = [];
    }
    if (obj.$id != null) {
      references.push(obj.$id);
    }
    for (const i in obj) {
      if (obj[i] != null &&  typeof(obj[i]) === 'object') {
        if (obj[i].$id != null && references.includes(obj[i].$id)) {
          clone[i] = {$ref: obj[i].$id};
        } else {
          clone[i] = this.serializeReferences(obj[i], references);
        }
      } else {
        clone[i] = obj[i];
      }
    }
    return clone;
  }

  unzipAndParseFile = (fileNames) => {
    const BOMCharCode = 65279;
    if (fileNames === undefined) { return; }
    this.filename = fileNames[0];
    const data = this.fs.readFileSync(this.filename, 'binary');
    this.zipfile = new this.zip(data);
    let partyString = this.zipfile.files['party.json'].asText();
    if (partyString.charCodeAt(0) === BOMCharCode) {
      partyString = partyString.substring(1);
    }
    this.party = this.resolveReferences(partyString);
    let playerString = this.zipfile.files['player.json'].asText();
    if (playerString.charCodeAt(0) === BOMCharCode) {
      playerString = playerString.substring(1);
    }
    this.player = this.resolveReferences(playerString);
    window['party'] = this.party;
    window['app'] = this;
    window['blueprints'] = Blueprints;
    // this.ref.markForCheck();
    this.ref.detectChanges();
  }

  resolveReferences(json) {
    if (typeof json === 'string') {
      json = JSON.parse(json);
    }
    const byid = {}, // all objects by id
    refs = []; // references to objects that could not be resolved
    json = (function recurse(obj, prop?, parent?) {
      if (typeof obj !== 'object' || !obj) { // a primitive value
        return obj;
      }
      if ('$ref' in obj) { // a reference
        const ref = obj.$ref;
        if (ref in byid) {
            return byid[ref];
        }
        // else we have to make it lazy:
        refs.push([parent, prop, ref]);
        return;
      } else if ('$id' in obj) {
        if (obj.$id in byid) {
          return obj;
        }
        const id = obj.$id;
        byid[id] = obj;
        if ('$values' in obj) { // an array
            obj = obj.$values.map(recurse);
        } else { // a plain object
            for (const newprop in obj) {
                obj[newprop] = recurse(obj[newprop], newprop, obj);
            }
        }
      } else if (Array.isArray(obj)) {
        obj = obj.map(recurse);
      } else {
        for (const newprop in obj) {
                obj[newprop] = recurse(obj[newprop], newprop, obj);
        }
      }
      return obj;
    })(json); // run it!

    for (let i = 0; i < refs.length; i++) { // resolve previously unknown references
      const ref = refs[i];
      ref[0][ref[1]] = byid[refs[2]];
      // Notice that this throws if you put in a reference at top-level
    }
    return json;
  }
}
