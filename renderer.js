// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var AdmZip = require('adm-zip');
const {dialog} = require('electron').remote;

let player;

function openFile () {
    var options = {filters: [{name: 'Kingmaker Save File', extensions: ['zks'] }],
        properties: ['openFile','treatPackageAsDirectory', 'showHiddenFiles'],
        defaultPath: '~/Library/Application Support/unity.Owlcat Games.Pathfinder Kingmaker/Saved Games/'}
    dialog.showOpenDialog(null,options, function (fileNames) {
        if (fileNames === undefined) return;
        var fileName = fileNames[0];
        var zip = new AdmZip(fileName);
        var zipentry = zip.getEntry('player.json');
        var playerString = zipentry.getData().toString('utf8');
        // First character from the JSON string is an invalid character?  Take it off
        playerString = playerString.substring(1);
        player = resolveReferences(playerString);
        console.log(player);
        document.querySelector('#xp').value = player.PartyXp;
        document.querySelector('#money').value = player.Money;
    });
}

function resolveReferences(json) {
    if (typeof json === 'string')
        json = JSON.parse(json);

    var byid = {}, // all objects by id
        refs = []; // references to objects that could not be resolved
    json = (function recurse(obj, prop, parent) {
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

document.querySelector('#openFile').addEventListener('click', openFile);