var sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../db/dbfile.db');
var db = new sqlite3.Database(dbPath,sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE );
var PersistentColumns;

serialize =  function(Columns){
  let SQL = '(id INTEGER PRIMARY KEY, ';
  PersistentColumns=Columns;

  Columns.forEach((elem,index)=>{
    SQL+=`${elem.title} TEXT`;
    if(index!=Columns.length-1){
      SQL+=', ';
    }
  });

  SQL+=');';

  db.serialize(function() {
    console.log("CREATE TABLE IF NOT EXISTS patients "+SQL)
    let stmt = db.prepare("CREATE TABLE IF NOT EXISTS patients "+SQL);
    stmt.run();

    //creating metaData Table

    let Metastmt = db.prepare("CREATE TABLE IF NOT EXISTS metadata (id INTEGER PRIMARY KEY," +
        "xlsFilePath TEXT,  autoSync INTEGER)");
    Metastmt.run();


    /*db.each("SELECT rowid AS id, info FROM lorem", function(err, row) {
      console.log(row.id + ": " + row.info);
    });*/

  });
};


getAllPatientsData =  function(){
  return new Promise((res,rej)=>{
    if(db){
      let SQL = 'SELECT * FROM patients; ';
      db.all(SQL, [], (err, rows) => {
        if (err) {
          rej(err);
        }
        console.log(rows.length);
        res(rows);
      });
    }
  })
}

addSingleRow = function(rowData){
  let ColumnsSQL = '(';

  PersistentColumns.forEach((elem,index)=>{
    let title = elem.title.replace(/'/g,"''");
    ColumnsSQL+=`${title}`;
    if(index!=PersistentColumns.length-1){
      ColumnsSQL+=', ';
    }
  });
  ColumnsSQL+=')';

  let dataSQL = '(';
  rowData.forEach((elem,index)=>{
    let dataText = elem.replace(/'/g,"''");
    dataSQL+=`'${dataText}'`;
    if(index!=rowData.length-1){
      dataSQL+=',';
    }
  });
  dataSQL+=')';

  console.log("INSERT INTO patients "+ColumnsSQL+
      " VALUES "+dataSQL+";");
  try{
    let stmt = db.prepare("INSERT INTO patients "+ColumnsSQL+
        " VALUES "+dataSQL+";");
    stmt.run();
  }catch (e) {
    console.error(e);
  }
  return true;
}


getMetaData = function(){
  return new Promise((res,rej)=>{
    if(db){
      let SQL = 'SELECT * FROM metadata; ';
      db.all(SQL, [], (err, rows) => {
        if (err) {
          rej(err);
        }
        res(rows);
      });
    }else{
      rej(false);
    }
  })
}

updateMetaData = function(dataToUpdate){
  let ColumnsSQL ='(';



  let dataSQL = '(';



  if(dataToUpdate["xlsFilePath"]){
    ColumnsSQL+='xlsFilePath';
    dataSQL+=`'${dataToUpdate["xlsFilePath"]}'`;
  }

  if(dataToUpdate["autoSync"]){
    if(dataToUpdate["xlsFilePath"]){
      ColumnsSQL+=",";
      dataSQL+=`,`;
    }
    ColumnsSQL+='autoSync';
    dataSQL+=`'${dataToUpdate["autoSync"]}'`;
  }


  ColumnsSQL+=')';
  dataSQL+=')';


  try{
    getMetaData().then(

        data=>{
          if(data.length!=0){
            let updateSQLStatement ='';
            if(dataToUpdate["xlsFilePath"]){
              updateSQLStatement+=`xlsFilePath = '${dataToUpdate["xlsFilePath"]}'`;
            }

            if(dataToUpdate["autoSync"]){
              if(dataToUpdate["xlsFilePath"]){
                updateSQLStatement+=`,`;
              }
              updateSQLStatement+=`autoSync = '${dataToUpdate["autoSync"]}'`;
            }
            console.log(updateSQLStatement);
            let stmt = db.prepare("UPDATE metadata SET "+updateSQLStatement+
                "WHERE id = 1 "+";");
            stmt.run();
          }else{
            let stmt = db.prepare("INSERT INTO metadata "+ColumnsSQL+
                " VALUES "+dataSQL+";");
            stmt.run();
          }
        }
    )
  }catch (e) {
    console.error(e);
  }
}


deleteAllData= function(){
  return new Promise((res,rej)=>{
    if(!db){
      rej(null);
    }
    let stmt = db.prepare("delete from patients");
    stmt.run(function (err,data) {
      if(err){
        rej(err);
      }
      res(data);
    });
  })
};

deleteAllMetaData = function(){
  return new Promise((res,rej)=>{
    if(!db){
      rej(null);
    }
    let stmt = db.prepare("delete from metadata");
    stmt.run(function (err,data) {
      if(err){
        rej(err);
      }
      res(data);
    });
  })
};


closeDatabase = function(){
  db.close();
}



module.exports={
  serialize:serialize,
  addSingleRow:addSingleRow,
  closeDatabase,
  getAllPatientsData,
  getMetaData,
  updateMetaData,
  deleteAllData,
  deleteAllMetaData
}


