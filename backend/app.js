const neo4j= require ('neo4j-driver');
const express = require ('express');
const cors = require('cors');
const app = express();
const port=3001;


const driver = neo4j.driver(
    'bolt://localhost:7687',
    neo4j.auth.basic('neo4j','simian123')
)

const session = driver.session();
const session2 = driver.session();

app.use(cors());

app.get('/api/nodes', async (req, res) => {
    const {crn}= req.query;
    try {
      const result = await session.run(
        'MATCH (s:GoldenID)-[r:TRX]->(t:GoldenID) where s.crn = $crn RETURN s, r, t LIMIT 100',
        { 
          crn: crn || '20170220000000001668'
    
        }
      );
  
      const graphData = result.records.map(record => ({
        source: {
          id: record.get('s').identity.low,
          name: record.get('s').properties.nama_lengkap 
        },
        target: {
          id: record.get('t').identity.low,
          name: record.get('t').properties.nama_lengkap 
        },
        relationship: record.get('r').type 
      }));
  
      res.json(graphData); // Kirim data sebagai JSON
    } catch (error) {
      console.error('Error fetching data from Neo4j:', error);

    } 
  });


  app.get('/api/nodes2', async (req, res) => {
    try {
      const result = await session2.run(
        'match (g:GoldenID)-[r:LIKES]->(x:Category)-[:PERSONA]->(pr:Persona) with x.type as category , sum(r.freq) as totalFreq , sum(r.amount) as amount return category ,totalFreq, amount '
      );
  
      const dataCat = result.records.map(record => ({
        data: {
          category: record.get('category'), // Gunakan ID node
          amount: record.get('amount')// Gunakan nama atau properti lain
        }
   
      }));
  
      res.json(dataCat); // Kirim data sebagai JSON
    } catch (error) {
      console.error('Error fetching data from Neo4j:', error);
      res.status(500).send('Internal Server Error');
    } 
  });


  const session3 = driver.session();

  app.get('/api/nodes3',async (req,res)=>{
    try{

      const result = await session3.run (
        'match (g:GoldenID) where g.pagerank <> 770.681115402938 return g.nama_lengkap as nama, g.pagerank as pg_score order by pg_score desc limit 20'
      )

      const databarchart = result.records.map(record => ({
        data: {
          nama: record.get('nama'), // Gunakan ID node
          score: record.get('pg_score')// Gunakan nama atau properti lain
        }
      
   
      }));
      res.json(databarchart);
    }
    catch (error) {
      console.error('Error fetching data from Neo4j:', error);
      res.status(500).send('Internal Server Error');
    } 

  });

  const transaction = driver.session();

  app.get('/api/transactions', async (req, res) => {
    // Params (filter) from request
    const { neodash_filter, neodash_year } = req.query;
  
    try {
      const result = await transaction.run(
        `
        MATCH (g:GoldenID {crn: $neodash_filter })-[:HAS]->(r:Purchased)-[:FROM]->(m:Merchant)-[:CATEGORIZE]->(x:Category) 
        WITH distinct(x.type) as category1, COUNT(r) AS all_transaction,x
        OPTIONAL MATCH (g:GoldenID {crn: $neodash_filter })-[:HAS]->(r2:Purchased)-[:FROM]->(m2:Merchant)-[:CATEGORIZE]->(x)
        WHERE date(r2.date).year = $neodash_year
        WITH category1, all_transaction, COUNT(r2) as transaction_year
        RETURN category1, transaction_year, all_transaction
        `,
        { 
          neodash_filter: neodash_filter || '20170220000000007359', // Default filter
          neodash_year: parseInt(neodash_year) || 2024 // Default year
        }
      );

      
      const responsesData = result.records.map(record => ({
        data: {
          category: record.get('category1'),
          transaction_year: record.get('transaction_year').low || 0, // Handle int type
          all_transaction: record.get('all_transaction').low || 0 
        }
      
   
      }));
  
      // Send back the formatted response
      res.json(responsesData);
  
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Failed to fetch data from Neo4j' });
    }  
    
  });

  const sankey = driver.session()
    
  app.get('/api/sankey', async (req, res) => {
    try {
      const result = await sankey.run(
        `
        match p=(g:GoldenID)-[r:LIKES]->(c:Category)--(pr:Persona)
        where pr.name ="Tech Enthusiast"
        match (c)<-[r2:CATEGORIZE]-(m:Merchant)<-[b:BUY]-(g)
        return g,b,m
        `
      );
  
      const graphData = result.records.map(record => ({
        from: {
          id: record.get('g').identity.low,
          name: record.get('g').properties.nama_lengkap 
        },
        to: {
          id: record.get('m').identity.low,
          name: record.get('m').properties.merchant_name 
        },
        amount: record.get('b').properties.amount.low
      }));
  
      res.json(graphData); // Kirim data sebagai JSON
    } catch (error) {
      console.error('Error fetching data from Neo4j:', error);
      res.status(500).send('Internal Server Error');
    } 
  });
  
app.listen(port,() =>{
    console.log(`sever jalan di http://localhost:${port}/api/nodes`);
});