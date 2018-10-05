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
        let blueprintHash = kv.Value.Blueprint;
        results.push(this.getFeatByBlueprint(blueprintHash));
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

  getAlignmentString(vector): string {
    var angle = Math.atan2(vector.y, vector.x) * 180 / Math.PI; //CCW Angle starting east
    if(angle < 0) angle += 360;
    angle -= 22.5 //let 0-45 equal chaotic good and -22.5-0 and 315-337.5 equal Chaotic Neutral
    console.log("Angle: " + angle);
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
