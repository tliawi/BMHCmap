/* 
BMHC.js

version 0.6 Copyright 2021 John R C Fairfield, see MIT License

*/

function BMHCobj(){
    
    const brethren  = 1;
    const mennonite = 2;
    // 0 neither, 3 both
    // name:val pairs, in names no double quotes, no ampersand. Blanks, Apostrophe are OK
    
    const minDate ='0001'; //least truthy date with four digit yyyy
    const maxDate = '9999/12/31';
    
    function bmhcDatabase(){
        this.idSource = 13; //source of unique ids for both assemblies and events
        this.verbs = ["begin-history", "set-locale", "set-membership", "set-affiliation", "set-photo", "add-tag", "remove-tag", "just-comment", "expire-into"]; //maintain parallel to critiqueVerbObject() and bmhcMapDisplay.html
        this.tags = [];
        this.assemblies = {}; //a dictionary of assemblyData, the keys being assembly names
    }
    
    const db = new bmhcDatabase(); //see setData
    
    let idToName = {}; //a dictionary of numeric id:string assemblyName pairs, 
    // not necessarily sorted if we merge concurrent access files...
    
    //the reason for ids, and idToName, is so one can change the name of an assembly
    //and all the stored object and comment ids do NOT have to change.
    //this can generate on the order of 2^52 ids, so not to worry.
    function getNextId(){
        return db.idSource++;
    }
    
    function getVerbs(){
        return [...db.verbs]; //shallow copy
    }
    
    function getTags(){
        return [...db.tags];
    }
    
    function setTags(tags){
        db.tags = tags;
    }
    
    function assemblyData(mb){
        this.id = getNextId();
        this.mb = mb;
        this.events = []; //an array of events comprising the history of an assembly
        //this.states is added when compiled
    }
    
    
    function sortObjByKeys(obj) {
      return Object.keys(obj).sort(new Intl.Collator('en').compare).reduce(function (result, key) {
        result[key] = obj[key];
        return result;
      }, {});
    }
    
    function buildIdToName(){
        idToName={};
        Object.entries(db.assemblies).forEach(([name, assemblyData]) => idToName[assemblyData.id] = name);
    }
    
    //only works with valid dates, though oldDate may be null (anything falsy)
    function yearLater(oldDate, date){
        let yr = parseInt(date);
        let delta = 1;
        
        if (oldDate){
            let oldYr = parseInt(oldDate);
            delta = yr-oldYr;
            if (delta > 50) delta = 1;
            else if (delta < -50) delta = 1;
        }
        
        return (yr+delta).toString() + date.substr(4);
    }
    
    function getAllAssemblyNames(){
        return Object.keys(db.assemblies);
    }
    
    function getMennoniteAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb & mennonite);
    }
    
    function getBrethrenAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb & brethren);
    }
    
    function getJointAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb == 3);
    }
    
    function getNeitherAssemblyNames(){
        return Object.keys(db.assemblies).filter(name => db.assemblies[name].mb == 0);
    }
    
    function getDenomination(name){
        if (assemblyExists(name)) return db.assemblies[name].mb; else return 0;
    }
    
    //returns false if name is null
    function assemblyExists(name){
        return (name in db.assemblies);
    }
    
    //given an array of Objects having a .date field
    function lifeTime(events){
        if (events.length)
            return { begin: events[0].date, 
                     end: (events[events.length-1].verb == 'expire-into')?events[events.length-1].date:maxDate };
        else return null;
    }
    
    function assemblyLifeTime(name) { 
        if (assemblyExists(name)) return lifeTime(db.assemblies[name].events);
        else return null;
    }
    
    function lastEvent(name){
        if (assemblyExists(name)) {
            let len = db.assemblies[name].events.length;
            if (len) return db.assemblies[name].events[len-1];
        }
        return null; //assembly doesn't exist, or has no events
    }
    
    function expirationDate(name){
        var lastEv = lastEvent(name);
        if (lastEv && lastEv.verb == 'expire-into') return lastEv.date;
        if (lastEv) return maxDate; //exists and hasn't expired
        return ''; //doesn't exist, or has no events, i.e. has never existed in time. 
        //Note both '0' and '0000' are true, '' is false.
    }
    
    function legitAssemblyParms(name, mb){
        // check for null, undefined, "", unfortunately 0, false.
        if (!Boolean(name)) return "blank names not allowed.";
        //does the return if mb is "whatever", whereas (mb<0 || mb > 3) would not
        if (!(mb >= 0 && mb <= 3)) return "this denomination not accepted.";
        if (name.trim().length == 0) return "blank names not allowed.";
        if (name.match(/\[/) || name.match(/\]/)) return "square brackets [ and ] not allowed in assembly names";
        return "ok";
    }
    
    
    function addAssembly(name,mb){ //mb bx00:neither bx10:Mennonnite bx01:Brethren bx11:both
        if (legitAssemblyParms(name,mb)!="ok") return legitAssemblyParms(name,mb); //defends against null, undefined etc.
        name = name.trim();
        if (assemblyExists(name))return "an assembly of this name already exists";
        
        var newAssy = new assemblyData(mb);
        db.assemblies[name] = newAssy;
        db.assemblies = sortObjByKeys(db.assemblies);
        idToName[newAssy.id] = name; //maintain idToName
        return "ok";
    }
    
    function changeAssembly(oldName, newName, mb){
        var data;
        if (legitAssemblyParms(newName,mb)!="ok") return legitAssemblyParms(newName,mb); //defends against null
        newName= newName.trim();
        if (!assemblyExists(oldName)) return "Target assembly doesn't exist.";
        if (newName != oldName && assemblyExists(newName)) return "an assembly of this name already exists."
        
        data = db.assemblies[oldName];
        delete db.assemblies[oldName];
        data.mb = mb; //keep id, events
        db.assemblies[newName] = data; //rename it keeping same id
        db.assemblies = sortObjByKeys(db.assemblies);
        idToName[data.id] = newName; //maintain idToName
        return "ok";
    }
    
    function removeInvalidEventReferences(id){
        let count = 0;
        //const re = new RegExp('\['+id+'\]','g');
        
        function filterObjectReferences(assembly){
            db.assemblies[assembly].events = db.assemblies[assembly].events.filter(event =>{
                if ((event.verb == "set-affiliation" || event.verb == "expire-into") && event.object == id ){count++; return false;}
                else return true;
            });
        }
        
        function clobberCommentReferences(assembly){
            db.assemblies[assembly].events.forEach(event =>{ 
                //let c = (event.comment.match(re) || []).length; //match can return null
                //if (c) event.comment = event.comment.replaceAll('['+id+']',"???"); 
                let nuComment = event.comment.replaceAll('['+id+']',"???");
                if (event.comment != nuComment){event.comment = nuComment; count++;} //undercounts if more than one, tant pis
            });
        }
    
        //scan and remove set-affiliation or expire-into events whose objIds == id, maintaining order of events
        Object.keys(db.assemblies).forEach(assembly => { 
            filterObjectReferences(assembly); 
            clobberCommentReferences(assembly);
        });
        
        return count;
    }
    
    //returns the number of invalidated references that have been removed
    function deleteAssembly(name){
        if (!assemblyExists(name)) return -1;
        //tosses assembly and its assemblyData, including all events therein.
        const id = db.assemblies[name].id;
        delete db.assemblies[name];
        delete idToName[id]; //maintain idToName
        return removeInvalidEventReferences(id);
    }
    
    //------ refs, whether idRefs [id], or namerefs [name]
    
    function cutOffEnds(ref){ return ref.substr(1,ref.length-2); }
    
    function isNumeric(input){
        return (input - 0) == input && (''+input).trim().length > 0;
    }
    
    function addBrackets(str) { return "[" + str + "]"; }
    
    function nameRefToIdRef(nameRef){
        return addBrackets(db.assemblies[cutOffEnds(nameRef)].id);
    }
    
    function idRefToNameRef(idRef){
        return addBrackets(idToName[cutOffEnds(idRef)]);
    }
    
    //------------------------ Events ------------------------------------
    // The events of an assembly are an array ordered by date.
    // Since the array index number of a given event can be changed by addition or deletion of other events,
    // the index number of a given event can only identify the event in read operations, not in write operations.
    
    function naiveEvent(date,verb,object,comment=''){
        this.date = date;
        this.verb = verb;
        this.object = object;
        this.comment = comment;
    }
    
    function sortEvents(events){
        function compareDates(e1,e2){return (e1.date < e2.date)?-1:((e1.date > e2.date)?1:0);}
        events.sort(compareDates);
    }
    
    
    function placeEvent(events,date, verb,object,comment){
        events.push(new naiveEvent(date,verb,object,comment));
        sortEvents(events);
    }

    
    // ---------------  checkEvent functions  -------------------------
    // I made them independent so that I know there are no extraneous references global to checkEvent,
    // i.e. so I know what all their parameters really are
    
    //A date 
    //is "yyyy      "
    //or "yyyy/mm   "
    //or "yyyy/mm/dd"
    //boolean
    function checkDateFormat(candidate){

        function remainderBlank(i){ return candidate.substr(i).trim().length == 0;}

        candidate = candidate.trim();
        if (candidate.length == 0) return "date is blank";

        if (!allDigits(candidate,0,4)) return "date year is weird. Needs four digits."
        if (candidate.substr(0,4) < "1000" || candidate.substr(0,4) > "3000") return "date year out of range"; 
        if (remainderBlank(4)) return "ok"; // yyyy
        if (candidate.charAt(4) != '/') return "date must have slash between year and month. Think yyyy/mm/dd";
        if (!allDigits(candidate,5,2)) return "date month is wierd";
        if (candidate.substr(5,2)<"01" || candidate.substr(5,2) > "12") return "date format requires two-digit months, like April 1888 is 1888/04"; //months
        if (remainderBlank(7)) return "ok"; // yyyy/mm
        if (candidate.charAt(7) != '/') return "date must have a slash between month and day. Think yyyy/mm/dd ";
        if (!allDigits(candidate,8,2)) return "date requires two-digit days, like 6th Dec 1888 is 1888/12/06";
        //check for 30 days hath september, etc...
        let mm = parseInt(candidate.substr(5,2),10)-1; //Date requires 0 based months
        let d = new Date( parseInt(candidate.substr(0,4),10), mm, parseInt(candidate.substr(8,2),10));
        //Given too many days, like the 29th feb in a non-leap-year month, Date constructor wraps it into the following month...
        if (d.getMonth() != mm) return "That month doesn't have that many days." 
        return "ok"; //yyyy/mm/dd
    }
    
    function checkGPS(coord){
        let numStrArr = coord.split(',');
        if (numStrArr.length != 2) return "GPS coordinates are two numbers separated by a comma.";
        let N=parseFloat(numStrArr[0]);
        let E=parseFloat(numStrArr[1]);
        if (!isNumeric(N) || !isNumeric(E)) return "GPS coordinates are two NUMBERS separated by a comma."
        if (N < -90 || N > 90 || E < -180 || E > 180 ) return "Those GPS coordinates are invalid. First should be Latitude (from -90 to +90), second is Longitude specified as Easting (from -180 to +180). In the eastern US, first should be between 25 and 48, and second betweeen -67 and -89. The simplest is to copy/paste coordinates from maps.google.com";
        return "ok" ;
    }
    

    //boolean, true if there is a circular reference, false if there is not.
    //this is simplified, and finds more loops than would be warranted if it considered dates. 
    //But it's ok to be heavy handed since such loops are not going to happen historically
    //unless someone is playing games or makes a mistake.
    function cyclicRefDFS(name, events, stack=[]){
        //name must not already be in stack. Events is presumed to be db.assemblies[name].events
        stack.push(name);
        for (let i=0;i<events.length;i++){
            let event = events[i];
            if ((event.verb == 'expire-into' || event.verb == 'set-affiliation') && event.object != '') {
                let objName = idToName[event.object];
                if (stack.includes(objName)) return true;
                if (cyclicRefDFS(objName,db.assemblies[objName].events,stack)) return true;
            }
        }
        stack.pop();
        return false; //all's well
    }
    
    function critiqueVerbObject(subject,date,verb,object){
            
        function checkObjectAnachronism(object,date){
            if (!assemblyExists(object)) return "there is no assembly named "+object;
            let lt = lifeTime(db.assemblies[object].events);
            if (lt==null || (lt.begin > date || lt.end < date)) return "assembly "+object+" doesn't exist at this date ("+date+")";
            return 'ok';
        }
        
        function checkRef(subject, verb, object){
            if (object.length) {
                    //note: object is not yet in db.assemblies[subject].events, it is under consideration but not yet added
                    //if (subject == object) return "An assembly can't reference itself";
                    if (!assemblyExists(object)) return 'There is no assembly named '+object;
                    let objId = db.assemblies[object].id;
                    let nuvents = [...(db.assemblies[subject].events)];
                    nuvents.push( new naiveEvent(minDate,verb,objId));
                    //a pseudo event pushed on to mimic the proposed event. 
                    //For heavyhanded cyclicRefDFS, dates and the order of events are irrelevant
                    if (cyclicRefDFS(subject, nuvents)) return "circular references are forbidden";
                    else return checkObjectAnachronism(object,date);
            } else return 'ok'; // '' is ok, can become unafffiliated, or expire-into nothing.
        }
        
        switch (verb){
            case "begin-history":
                if (object.length > 0) return "begin-history object should be blank. Put info in comment."
                return 'ok';
            case "set-locale":
                return checkGPS(object);
            case "set-membership":
                if (object.length && allDigits(object,0,object.length)) return "ok";
                return "bad membership count";
            case "set-affiliation":
                return checkRef(subject,verb,object);
            case "set-photo": 
                if (object.length > 0) return "ok"; //---------------unfinished checkURL??? 
                return "bad URL";
            case "add-tag":
                if (db.tags.includes(object)) return "ok";
                return "unrecognized tag";
            case "remove-tag":
                if (db.tags.includes(object)) return "ok";
                return "unrecognized tag";
            case "just-comment":
                if (object.length > 0) return "just-comment object should be blank. Put info in comment.";
                return "ok";
            case 'expire-into': 
                return checkRef(subject,verb,object);
            default: 
                return "verb not recognized";

        }
    }
    
    //does total scan of db searching for references to subject outside the given lifeTime.
    //If lifeTime is null, any reference to subject is illegit. 
    function checkReferences(subject, lifeTime){

        var subjectId = db.assemblies[subject].id;
        
        //if in other assemblies there are set-affiliation or expire-into events outside my lifeTime, complain!
        //total scan of db! NOTE: can't 'return' (or break) from a "forEach", so I use oldfashioned loops

        var names = Object.keys(db.assemblies);

        for (let i=0; i<names.length; i++){ 
            let name = names[i]; 
            if (name!=subject){ //skip myself
                let events = db.assemblies[name].events;
                for (let j=0; j<events.length; j++) {
                    let event = events[j];
                    if (event.object == subjectId && (event.verb == 'set-affiliation' || event.verb == 'expire-into')){
                        if (!lifeTime || event.date < lifeTime.begin || event.date > lifeTime.end) return name+" has a "+event.verb+" event referring to "+subject+" that is dated "+event.date+". Please fix.";
                    }
                }
            }
        }

        return 'ok';
    }
    
    //total scan of db
    //checks validity of an events array
    function checkEvents(subject, events){
            
        for (let i=1;i<events.length;i++) if (events[i].date < events[i-1].date) return 'Error: events out of order, please notify administrator';
        if (events.length && events[0].verb != 'begin-history') return 'first event must be begin-history';
        for (let i=1;i<events.length;i++) if (events[i].verb == 'begin-history') return 'only the first event may be begin-history';
        for (let i=1;i<events.length-1;i++) if (events[i].verb == 'expire-into') return 'there can only be one expire-into, which must be the last event';

        //total scan of db
        return checkReferences(subject,lifeTime(events)); 
    }
    
    
    // date, verb, object, comment must already be trimmed,
    // references in comment must already be in [id] rather than [name], and
    // if verb is set-afiliation or expire-into, object must already be in id, not in name.
    function newEventsArray(events, eventIndex, date,verb,object,comment){
        let nuvents = [ ...events]; //veerrryyy risky. events and nuvents are separate
        //arrays, but their events are the same event objects--they share their contents.
        if (eventIndex == null) { //going to add a new event
            // Issue is events having the same date as begin-history and/or expire-into.
            //Will be sorted by date before verification by checkEvents, 
            //but sort preserves insertion order when dates are identical.
            //So policy is to add to end (fine for events having same date as begin-history), 
            //unless end is already an expire-into
            //in which case you want to add before the expire-into.
            nuvents.push(new naiveEvent(date,verb,object,comment)); //on the end
            if (nuvents.length >1 && nuvents[nuvents.length-1].verb == "expire-into") { //swap last two
                let swap = nuvents[nuvents.length-1];
                nuvents[nuvents.length-1] = nuvents[nuvents.length-2];
                nuvents[nuvents.length-2] = swap;
            }
        } else { //replace the eventIndexed event, in nuvents but not in events.
            // nuvents is a candidate that must be further evaluated.
            nuvents[eventIndex]=new naiveEvent(date,verb,object,comment);
        }
        sortEvents(nuvents);
        return nuvents;
    }
    
    //returns "ok" or an error statement
    //date,verb,object,comment must already be trimmed.
    //if eventIndex == null, check is for adding the event given in the remaining parameters.
    //Otherwise, checks for replacing db.assemblies[subjectAssembly].events[eventIndex] with the given event.
    function checkEvent(subjectAssembly,eventIndex,date,verb,object,comment){ 
        
        if (!assemblyExists(subjectAssembly)) return "subject assembly '"+subjectAssembly+"' doesn't exist";
        
        let events=db.assemblies[subjectAssembly].events;
        
        if (eventIndex != null && (!isNumeric(eventIndex) || eventIndex < 0 || eventIndex >= events.length)) return 'invalid event index '+eventIndex ;
        if (checkDateFormat(date)!="ok") return checkDateFormat(date);
        let nok = critiqueVerbObject(subjectAssembly,date,verb,object);
        if (nok != "ok") return nok;
        
        try{ comment = nameRefsToIdRefs(comment); } catch (e) {return e };  //---------***test this one***
        if (object.length && (verb=='set-affiliation' || verb=='expire-into')) object = db.assemblies[object].id; //critiqueVerbObject has already verified ok
        
        return checkEvents(subjectAssembly,newEventsArray(events,eventIndex,date,verb,object,comment));
    }
    
    
    // ---------------------- adding, deleting, editing events ----------------------
    
    
    //replaces db.assemblies[assemblyName].events[eventIndex] with the given event information.
    //if eventIndex==null, adds the given event as a new event.
    function setEvent(assemblyName, eventIndex, date, verb, object, comment){
        
        assemblyName = assemblyName.trim(); 
        date = date.trim();
        verb = verb.trim();
        object = object.trim();
        comment = comment.trim();
        let ce = checkEvent(assemblyName,eventIndex,date,verb,object,comment);
        if (ce != 'ok') return ce;
        
        comment = nameRefsToIdRefs(comment); //already verified ok
        if (object.length && (verb=='set-affiliation' || verb=='expire-into')) object = db.assemblies[object].id; //already verified ok
        db.assemblies[assemblyName].events = newEventsArray(db.assemblies[assemblyName].events,eventIndex,date,verb,object,comment);
        
        return 'ok';
    }
    
    
    function deleteEvent(assemblyName,index){
        if (!assemblyExists(assemblyName)) return "That assembly doesn't exist";
        
        if (isNumeric(index) && index >=0 && index < db.assemblies[assemblyName].events.length) {
            
            if (index == 0 && db.assemblies[assemblyName].events.length > 1) return "You can't DELETE the begin event until you've first deleted all other events. You could EDIT the begin event, if you want to shift its date or add a comment.";
            
            if (index==0) {
                let chk = checkReferences(assemblyName, null); 
                if (chk != 'ok') return chk;
            } //deletion of any other event than begin-history does not contract the lifeTime, so no need to checkReferences
            
            db.assemblies[assemblyName].events.splice(index,1); //remove the indexed event
            //has stayed sorted
            return 'ok';
            
        } else return 'bad event index';
    }
    
    
    // ------------------------------- getEventStrings --------------------------
    //returns modified str
    //replacing each [name] reference with [id] reference
    function nameRefsToIdRefs(str){ //replace each [name] reference with [id] reference
        let refs = str.match(/\[.+?\]/g) ; //returns an array of refs "[xxx]" from the strings
        if (!refs) return str;
        refs = refs.map(ref=>cutOffEnds(ref).trim());
        refs.forEach(ref => { if (!db.assemblies[ref]) throw ref + " is not a known assembly."; });
        refs.forEach(ref=> { str = str.replace(ref,db.assemblies[ref].id);});
        return str;
    }
    
    
    function allDigits(candidate,start,len){
        const snippet = candidate.substr(start,len);
        if ( snippet.length != len) return false;
        return /^\d+$/.test(snippet);
    }

    //returns modified str
    //replacing each [id] reference with [name] reference
    function idRefsToNameRefs(str){ 
        let refs = str.match(/\[\d+\]/g) ; //returns an array of refs "[d+]" from the strings
        if (!refs) return str;
        refs = refs.map(ref=>cutOffEnds(ref));
        refs.forEach(ref => { if (!idToName[ref]) throw ref+" is an unknown assembly reference.";}) ;
        refs.forEach(ref=> { str = str.replace(ref,idToName[ref]);});
        return str;
    }
    
    
    //returns naiveEvent of dereferenced strings
    function dereferencedEvent(ev){
        return new naiveEvent( ev.date, ev.verb, ((ev.object == '')?'':((ev.verb == 'set-affiliation' || ev.verb == 'expire-into')?idToName[ev.object]:ev.object)), idRefsToNameRefs(ev.comment));
    }
                         
    //Used for display of list of events.
    //Returns an array of formatted dereferencedEvents corresponding to the events of an assembly
    //the indices of events in this array are valid to use in deleteEvent IFF there have been no setEvents or deleteEvents in between. 
    //So every time you add or delete one, you have to getEventStrings again, so your indices are good.
    function getEventStrings(assemblyName){ 
        
        //flesh out date with trailing blanks to be (at least) len chars long.
        function buff(date,len){ 
            if (len <= date.length) return date;
            else return date + " ".repeat(len-date.length);
        }
        
        function eventToString(ev){
            let sev = dereferencedEvent(ev);
            return buff(sev.date,10) + ' ' + sev.verb + (sev.object.length?(' '+sev.object):'') + (sev.comment.length?(' comment:'+ sev.comment):'');
        }
        
        if (assemblyExists(assemblyName)) {
            return db.assemblies[assemblyName].events.map(ev => eventToString(ev));
        }
        else return [];
    }
    
    function getDereferencedEvent(assemblyName,index){
        if (assemblyExists(assemblyName) && index >=0 && index < db.assemblies[assemblyName].events.length) return dereferencedEvent(db.assemblies[assemblyName].events[index]);
        else return null;
    }
    
    
    //used to initialize db.assemblies from file
    function setData(data){
        db.idSource = data.idSource;
        db.assemblies = data.assemblies;
        buildIdToName();
    }
    
    //used to create a JSON copy of db
    function getData(){
        return '{"idSource":' + db.idSource + ',"assemblies":' + JSON.stringify(db.assemblies,null,'\t') + '}';
    }
    
    var wrapperPrefix = "function bmhcData(){ return ";
    var wrapperSuffix = "; }";
    function wrapInJS(contentString){
        return wrapperPrefix+contentString+wrapperSuffix ;
    }
    
    function unwrap(wrappedData){
        return wrappedData.substring(wrapperPrefix.length,wrappedData.length-wrapperSuffix.length);
    }
    
    
    
    //--------------------- in support of compileGeojson ------------------
    
    
    function mostRecentIdentity(id,date){
        if ( id == '' )return id;
        var events= db.assemblies[idToName[id]].events;
        for (var i=0;i<events.length;i++) {
            if (events[i].date > date) break;
            if (events[i].verb == 'expire-into'){
                return mostRecentIdentity(events[i].object,date);
                //you became the new identity. We fear no circularity, that was excluded during data entry.
            }
        }
        return id;
    }
    
    //returns affiliation name as of the given date, or '' if none.
    //note that if an assembly expires into another (for a renaming or merger)
    //then post-merger 
    //affiliates to the old one become affilates to the new.
    
    //Which further implies the new one's affiliation holds as the affiliation of the old.
    //The people moved into another institution, and we're tracking those peoples' affiliation.
    
    //example: Weavers was affiliated with Middle District, in turn affiliated to Virginia Conference
    //but Middle District expired into Central District, also affiliated to Virginia Conference.
    //Virginia Conference was affiliated to (Old) Mennonites which expired into MCUSA.
    //So by 2010 Weavers church, whose most recent set-affiliation was to Middle District, 
    // whose mostRecentIdentity is Central District, and Central District is affiliated to
    //to Virginia Conference, whose most recent set-affiliation was to (Old) Mennonites,
    //whose mostRecentIdentity was MCUSA.
    
    function mostRecentAffiliation(id,date){
        if (id=='') return id;
        var events = db.assemblies[idToName[id]].events;
        var currentAffiliationId = '';
        for (var i=0;i<events.length;i++) {
            if (events[i].date > date) break;
            if (events[i].verb == 'set-affiliation') {
                //in say 2010, this is the path by which Weavers is seen as affiliated to Central District,
                //or Virginia Conference is seen as affiliated to MCUSA,
                //in both cases the explicit affiliate expired into something else, i.e. 
                //its mostRecentIdentity differed from the set-affiliation identity in events[i].object
                currentAffiliationId = mostRecentIdentity(events[i].object,date); //may be ''.
            }
            if (events[i].verb == 'expire-into'){
                //suppose Middle District were affiliated to Virginia Menno Conf, 
                //then Middle District expired into Central District, 
                //then Central District affiliated to SouthEastern Conference.
                //This is the path by which Weavers would beccome indirectly affiliated to SouthEastern.
                //Alternately, suppose Central District did not affiliate with anyone. Then
                //this is the path by which Weavers would become unaffiliated to anything higher than Central District.
                return mostRecentAffiliation(events[i].object, date); //you became the new identity. We fear no circularity, that was excluded during data entry.
            }
        }
        if (currentAffiliationId == '') return currentAffiliationId;
        else return idToName[currentAffiliationId];
    }
    
    //name and date must be validated beforehand, does not check.
    //returns an array of the ascending affiliations of the named assembly, at the given date
    function getCurrentAffiliations(name, date){
        var mra = mostRecentAffiliation(db.assemblies[name].id,date);
        if (mra == '') return [];
        else {
            let result = getCurrentAffiliations(mra,date); //damn push returns length of modified array, not the array itself!
            result.push(mra); //no circularity possible, was excluded in data entry.
            return result;
        }
    }
    
    //getCurrent coordinates, membership, and photo
    //returns { null, 0, '' } if date out of lifetime
    function getCurrentCoMePh(name,date){ 
        let reps = { coordinates:null, membership:0, photo:'' };
        let events = db.assemblies[name].events;
        for (let i=0;i<events.length;i++) {
            let event = events[i];
            if (event.date > date) break;
            if (event.verb == 'set-locale') reps.coordinates = event.object;
            else if (event.verb == 'set-membership') reps.membership = event.object;
            else if (event.verb == 'set-photo') reps.photo = event.object;
            else if (event.verb == 'expire-into') return { coordinates:null, membership:0, photo:'' };
        }
        return reps;
    }
    
    //returns [] if date out of lifetime
    function getCurrentTags(name,date){
        let tags = [];
        let events = db.assemblies[name].events;
        for (let i=0;i<events.length;i++) {
            let event = events[i];
            if (event.date >= date) break;
            if (event.verb == 'add-tag') { 
                if (!(tags.includes(event.object))) tags.push(event.object);
            } else if (event.verb == 'remove-tag') tags = tags.filter(value =>  value != event.object );
            else if (event.verb == 'expire-into') tags = [];
        }
        return tags;
    }


    //the state of an assembly at a given date
    function State(name,date){
        date = date+''; //convert to string if neccessary
        let cmp = getCurrentCoMePh(name,date);
        this.coordinates = cmp.coordinates;
        this.membership = cmp.membership;
        this.photo = cmp.photo;
        this.affiliations = getCurrentAffiliations(name,date);
        this.tags = getCurrentTags(name,date);
    }

    //only include what is necessary to distinguish two states of the same assembly, regardless of date
    State.prototype.comparisonString = function() {
        return this.coordinates +'::'+ this.membership +'::'+ this.affiliations.join(';;') +'::'+ this.tags.join(';;') +'::'+ this.photo;
    }

    function getState(name,date){
        return new State(name,date);
    }
    
    
    return {
            maxDate:maxDate,
            minDate:minDate,
        
            cutOffEnds:cutOffEnds,
            yearLater:yearLater,
        
            getVerbs:getVerbs,
        
            wrapInJS:wrapInJS,
            unwrap:unwrap,
        
            getData:getData,
            setData:setData,
            
            getTags:getTags,
            setTags:setTags,
            
            getAllAssemblyNames:getAllAssemblyNames,
            getMennoniteAssemblyNames:getMennoniteAssemblyNames,
            getBrethrenAssemblyNames:getBrethrenAssemblyNames,
            getNeitherAssemblyNames:getNeitherAssemblyNames,
            getJointAssemblyNames:getJointAssemblyNames,
            getDenomination:getDenomination,
            assemblyExists:assemblyExists,
            addAssembly:addAssembly,
            changeAssembly:changeAssembly,
            deleteAssembly:deleteAssembly,
            
            setEvent:setEvent,
            deleteEvent:deleteEvent,
            getDereferencedEvent:getDereferencedEvent,
            getEventStrings:getEventStrings,
        
            assemblyLifeTime:assemblyLifeTime,
            getState:getState,
        
            //temporary, for testing only
            mostRecentAffiliation:mostRecentAffiliation,
            mostRecentIdentity:mostRecentIdentity,
            getCurrentAffiliations:getCurrentAffiliations,
            db:db
           };

}