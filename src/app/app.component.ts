import { Component, ChangeDetectorRef } from '@angular/core';
import {Buffer} from 'buffer';

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
  characterNames: any = {};

  constructor(private ref: ChangeDetectorRef){
    this.characterNames["77c11edb92ce0fd408ad96b40fd27121"] = "Linzi";
    this.characterNames["5455cd3cd375d7a459ca47ea9ff2de78"] = "Tartuccio";
    this.characterNames["54be53f0b35bf3c4592a97ae335fe765"] = "Valerie";
    this.characterNames["b3f29faef0a82b941af04f08ceb47fa2"] = "Amiri";
    this.characterNames["aab03d0ab5262da498b32daa6a99b507"] = "Harrim";
    this.characterNames["32d2801eddf236b499d42e4a7d34de23"] = "Jaethal";
    this.characterNames["b090918d7e9010a45b96465de7a104c3"] = "Regongar";
    this.characterNames["f9161aa0b3f519c47acbce01f53ee217"] = "Octavia";
    this.characterNames["f6c23e93512e1b54dba11560446a9e02"] = "Tristian";
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
    if (this.characterNames[character.Descriptor.Blueprint] != null)
      return this.characterNames[character.Descriptor.Blueprint];
    return character.Descriptor.Blueprint;
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
