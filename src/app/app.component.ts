import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  player: any = {Money: null, PartyXp: null};
  dialog = window['electron'].remote.dialog;
  AdmZip = window['AdmZip'];

  openFile() {
    var options: any = {filters: [{name: 'Kingmaker Save File', extensions: ['zks'] }],
        properties: ['openFile','treatPackageAsDirectory', 'showHiddenFiles'],
        defaultPath: '~/Library/Application Support/unity.Owlcat Games.Pathfinder Kingmaker/Saved Games/'};
    this.dialog.showOpenDialog(null,options, this.unzipAndParseFile);
  }

  unzipAndParseFile = (fileNames) => {
    if (fileNames === undefined) return;
    var fileName = fileNames[0];
    var zip = this.AdmZip(fileName);
    var zipentry = zip.getEntry('player.json');
    var playerString = zipentry.getData().toString('utf8');
    // First character from the JSON string is an invalid character?  Take it off
    playerString = playerString.substring(1);
    this.player = this.resolveReferences(playerString);
    console.log(this.player);
  }

  resolveReferences(json) {
    if (typeof json === 'string')
      json = JSON.parse(json);

    var byid = {}, // all objects by id
    refs = []; // references to objects that could not be resolved
    json = (function recurse(obj, prop?: string, parent?) {
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
        var id = obj.$id;
        delete obj.$id;
        if ("$values" in obj) // an array
            obj = obj.$values.map(recurse);
        else // a plain object
            for (var prop in obj)
                obj[prop] = recurse(obj[prop], prop, obj)
        byid[id] = obj;
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
