const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const pool = require('./db');
const app = express();

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),  // Ensure 'uploads/' folder exists
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});



app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.json()); // to parse application/json                             
app.use(express.urlencoded({ extended: true })); // to parse form data      

app.use(session({
  secret: 'secret-key',
  resave: false,
  saveUninitialized: true  
}));                                                                  

// Fake login session                                                                                                                                            
app.use((req, res, next) => {
  req.session.user = { emp_id: 'emp_81', name: 'Hardik Prajapati' };              
  next();                       
});                                                                                                                           

app.get('/', async (req, res) => {                                                        
  const user = req.session.user;
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        city,
        action_type,
        mobile_number,
        customer_type,
        account_owner,
        po_no,
        ack_no,
        billing_address,
        spoc
        /* …any other fields you want to edit… */
      FROM sales_enquiry
      WHERE account_owner = $1
    `, [user.name]);
    res.render('dashboard', {
      user,
      enquiries: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});        

const normalizeDate = (value) => {
  const str = (value || "").toString().trim();
  return str !== '' ? str : null;
};

app.post('/save-entry', upload.single('confirmation_pdf'), async (req, res) => {
  const {
    company, poc, mobile, city, email, type,
    email_subject, email_body,
    followup_email_sub, followup_email_body,
    action, entry_id, start_date, duration, end_date,
    residential_screen, r_per_screen, r_plan,
    corporate_screen, c_per_screen, c_plan,
    outdur_screen, o_per_screen, o_plan,
    note, amount, invoice_no, invoice_date,
    po_no, po_date, place_of_supply, payment_terms,
    ack_no, ack_date, irn, spoc, billing_address,
    GST_No, pan_No, Website
  } = req.body;

  const owner = req.session.user.name;
  const confirmation_pdf = req.file ? req.file.filename : null;

  try {
    if (!entry_id) {
      const result = await pool.query(`
        INSERT INTO sales_enquiry (
          account_owner, name, poc_name, mobile_number,
          city, email, customer_type
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [owner, company, poc, mobile, city, email, type]);

      res.json({ id: result.rows[0].id });

    } else {
      await pool.query(`
        UPDATE sales_enquiry
        SET 
          action_type = $1,
          email_sub = $2,
          email_body = $3,
          followup_email_sub = $4,
          followup_email_body = $5,
          start_date = $6,
          total_value = $7,
          end_date = $8,
          residential_screen = $9,
          r_per_screen = $10,
          r_plan = $11,
          corporate_screen = $12,
          c_per_screen = $13,
          c_plan = $14,
          outdur_screen = $15,
          o_per_screen = $16,
          o_plan = $17,
          note = $18,
          amount = $19,
          confirmation_pdf = $20,
          invoice_no = $21,
          invoice_date = $22,
          po_no = $23,
          po_date = $24,
          place_of_supply = $25,
          payment_terms = $26,
          ack_no = $27,
          ack_date = $28,
          irn = $29,
          spoc = $30,
          billing_address = $31,
          gst_no = $32,
          pan_no = $33,
          website = $34
        WHERE id = $35
      `, [
        action,
        email_subject, email_body,
        followup_email_sub, followup_email_body,
        normalizeDate(start_date), duration, normalizeDate(end_date),
        residential_screen, r_per_screen, r_plan,
        corporate_screen, c_per_screen, c_plan,
        outdur_screen, o_per_screen, o_plan,
        note, amount, confirmation_pdf,
        invoice_no, normalizeDate(invoice_date),
        po_no, normalizeDate(po_date),
        place_of_supply, payment_terms,
        ack_no, normalizeDate(ack_date),
        irn, spoc, billing_address,
        GST_No, pan_No, Website,
        entry_id
      ]);

      res.sendStatus(200);
    }

  } catch (err) {
    console.error('DB Error:', err);
    res.status(500).send("Database error");
  }
});





// Route to handle updating an existing entry
app.put('/update-entry/:id', async (req, res) => {
  const entryId = req.params.id;  // Get entry ID from URL
  // Helper: convert "" to null for date fields
const parseDate = (val) => (val === '' ? null : val);
const {
  account_owner, name, poc_name, mobile_number, city, email, customer_type,
  action_type, email_sub, email_body, followup_email_sub, followup_email_body,
  start_date, duration, residential_screen, r_per_screen, r_plan,
  corporate_screen, c_per_screen, c_plan, outdur_screen, o_per_screen, o_plan,
  note, invoice_no, invoice_date, amount, closure_date, closed_won_remarks,
  po_no, po_date, gst_no, pan_no, website, place_of_supply, payment_terms, ack_no,
  ack_date, irn, spoc, billing_address
} = req.body;

try {
  const query = `
    UPDATE sales_enquiry SET
      account_owner = $1, name = $2, poc_name = $3, mobile_number = $4, city = $5, email = $6, customer_type = $7,
      action_type = $8, email_sub = $9, email_body = $10, followup_email_sub = $11, followup_email_body = $12,
      start_date = $13, total_value = $14, residential_screen = $15, r_per_screen = $16, r_plan = $17,
      corporate_screen = $18, c_per_screen = $19, c_plan = $20, outdur_screen = $21, o_per_screen = $22, o_plan = $23,
      note = $24, invoice_no = $25, invoice_date = $26, amount = $27, end_date = $28, confirmation_pdf = $29,
      po_no = $30, po_date = $31, gst_no = $32, pan_no = $33, website = $34, place_of_supply = $35, payment_terms = $36,
      ack_no = $37, ack_date = $38, irn = $39, spoc = $40, billing_address = $41
    WHERE id = $42
  `;

  const values = [
    account_owner, name, poc_name, mobile_number, city, email, customer_type,
    action_type, email_sub, email_body, followup_email_sub, followup_email_body,
    parseDate(start_date), duration, residential_screen, r_per_screen, r_plan,
    corporate_screen, c_per_screen, c_plan, outdur_screen, o_per_screen, o_plan,
    note, invoice_no, parseDate(invoice_date), amount, parseDate(closure_date), closed_won_remarks,
    po_no, parseDate(po_date), gst_no, pan_no, website, place_of_supply, payment_terms,
    ack_no, parseDate(ack_date), irn, spoc, billing_address, entryId
  ];

  await pool.query(query, values);

  res.status(200).json({ message: 'Data updated successfully' });
} catch (err) {
  console.error(err);
  res.status(500).json({ message: 'Error updating data', error: err });
}
});


app.get('/get-entry/:id', async (req, res) => {
  const entryId = req.params.id;
  console.log("Received entryId:", entryId);  // Add a log to check
  try {
    const entry = await pool.query('SELECT * FROM sales_enquiry WHERE id = $1', [entryId]);
    if (entry.rows.length > 0) {
      res.json(entry.rows[0]);
    } else {
      res.status(404).json({ error: 'Entry not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});











app.get('/enquiry/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query('SELECT * FROM sales_enquiry WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).send("Not found");
    }
    res.render('edit-enquiry', { enquiry : result.rows[0] ,  enquiryList: result.rows});
  } catch (err) {
    console.error('Error fetching enquiry:', err);
    res.status(500).send("Server error");
  }
});
app.post('/enquiry-inline/:id', async (req, res) => {
  const id = req.params.id;
  const fields = [
    'name', 'city', 'action_type', 'mobile_number', 'customer_type',
    'email', 'gst_no', 'pan_no', 'website', 'billing_address',
    'shipping_address'
  ];

  const updates = [];
  const values = [];
  const clean = val => Array.isArray(val) ? val.join(', ') : val;

  fields.forEach(field => {
    if (req.body[field] !== undefined) {
      const cleanedValue = clean(req.body[field]);
      updates.push(`${field} = $${values.length + 1}`);
      values.push(cleanedValue);
    }
  });

  // Add last_modified_by from session
  const lastModifiedBy = req.session.user?.name || 'Unknown';
  updates.push(`last_modified_by = $${values.length + 1}`);
  values.push(lastModifiedBy);

  values.push(id);

  if (updates.length === 0) return res.status(400).send("No data to update");

  try {
    await pool.query(`UPDATE sales_enquiry SET ${updates.join(', ')} WHERE id = $${values.length}`, values);
    res.status(200).json({ message: "Successfully updated" });
  } catch (err) {
    console.error('Inline Update Error:', err);
    res.status(500).send("Update failed");
  }
});






app.listen(3000, () => console.log('Server running on http://localhost:3000'));                                                                                                                                                                                                  
      