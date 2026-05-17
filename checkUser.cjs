const { Client } = require('pg');

async function checkUser() {
  const client = new Client({
    connectionString: 'postgresql://postgres:postgres@localhost:5432/mara_backend?schema=public'
  });

  try {
    await client.connect();
    const res = await client.query('SELECT id, email, role, "shopId" FROM "User" WHERE email = $1', ['diegonrm1999@gmail.com']);
    console.log(JSON.stringify(res.rows, null, 2));
    
    if (res.rows.length > 0 && res.rows[0].role !== 'Admin') {
      console.log('Updating user role to Admin...');
      await client.query('UPDATE "User" SET role = $1 WHERE email = $2', ['Admin', 'diegonrm1999@gmail.com']);
      console.log('Updated user role to Admin.');
    }
  } catch (err) {
    console.error('Error executing query', err.stack);
  } finally {
    await client.end();
  }
}

checkUser();
