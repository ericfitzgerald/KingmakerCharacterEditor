import { Component, ChangeDetectorRef } from '@angular/core';
import {Buffer} from 'buffer';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  player: any = {Money: null, PartyXp: null, CrossSceneState: {m_EntityData: null}};
  dialog = window['electron'].remote.dialog;
  fs = window['electron'].remote.require('fs');
  zip = window['zip'];
  filename: string;
  zipfile: any;
  characterNames: any = {};

  constructor(private ref: ChangeDetectorRef){
    this.characterNames['513484be-59c4-40e2-bde4-4f8d37cb8a45'] = 'Linzi';
    this.characterNames['cf492656-2770-460e-818e-3ce605b2d7c9'] = 'Tartuccio';
    this.characterNames['71e21e95-25e6-4a50-8a94-2639c64956df'] = 'Jaethal';
    this.characterNames['61c0fc80-1576-41f3-945b-fdb423656c63'] = 'Amiri';
    this.characterNames['b2ce5a89-4650-4cf8-83b0-44c7373ea5be'] = 'Regongar';
    this.characterNames['6063cfc6-faa5-4f9c-8ad5-451020147271'] = 'Octavia';
    this.characterNames['cc507090-556e-4885-8b6d-db1c864669dc'] = 'Harrim';
    this.characterNames['bc0e6cf6-f3a2-4d8c-be6c-b57846f2fea5'] = 'Valerie';
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
    var data = this.zipfile.generate({base64: false, compression: 'DEFLATE'});
    this.fs.writeFileSync(this.filename,data,'binary');
  }

  getName(character): string {
    if (character == null)
      return '';
    if (character.Descriptor != null && character.Descriptor.CustomName != null && character.Descriptor.CustomName != '')
      return character.Descriptor.CustomName;
    if (this.characterNames[character.UniqueId] != null)
      return this.characterNames[character.UniqueId];
    return character.UniqueId;
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
