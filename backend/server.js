const express = require('express');
const neo4j = require('neo4j-driver');
const app = express();
const port = 3001;

// Neo4j connection configuration
const driver = neo4j.driver('bolt://localhost:7687', neo4j.auth.basic('neo4j', 'password'));
const session = driver.session();

// Middleware for parsing JSON data
app.use(express.json());

// Endpoint for running Neo4j query
app.get('/api/transactions', async (req, res) => {
  // Params (filter) from request
  const { neodash_filter, neodash_year } = req.query;

  try {
    const result = await session.run(
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

    // Format the result into a JSON response
    const responseData = result.records.map(record => {
      return {
        category: record.get('category1'),
        transaction_year: record.get('transaction_year').low || 0, // Handle int type
        all_transaction: record.get('all_transaction').low || 0   // Handle int type
      };
    });

    // Send back the formatted response
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch data from Neo4j' });
  } finally {
    await session.close();  // Make sure session is closed after the query
  }
});

// Close Neo4j driver when the application ends
process.on('exit', async () => {
  await driver.close();
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
