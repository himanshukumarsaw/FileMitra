import mongoose from 'mongoose'
import { EmployeeMaster } from './models/EmployeeMaster.js'

const employees = [
  {
    employee_code: 'FD-HR-0001',
    full_name: 'Rahul Kumar',
    dob: new Date('1990-05-15'),
    designation: 'Forest Guard',
    department: 'Forest Department',
    office: 'Central Forest Division',
    district: 'Pune',
    registered_mobile: '9876543210',
    official_email: 'rahul.kumar@forest.gov.in',
    employment_status: 'ACTIVE',
    registration_status: 'NOT_REGISTERED',
    is_active: true,
  },
  {
    employee_code: 'FD-HR-0002',
    full_name: 'Priya Sharma',
    dob: new Date('1988-03-22'),
    designation: 'Forest Ranger',
    department: 'Forest Department',
    office: 'Wildlife Division',
    district: 'Mumbai',
    registered_mobile: '9876543220',
    official_email: 'priya.sharma@forest.gov.in',
    employment_status: 'ACTIVE',
    registration_status: 'NOT_REGISTERED',
    is_active: true,
  },
  {
    employee_code: 'FD-HR-0003',
    full_name: 'Amit Singh',
    dob: new Date('1992-11-08'),
    designation: 'Forest Officer',
    department: 'Forest Department',
    office: 'Central Forest Division',
    district: 'Pune',
    registered_mobile: '9876543230',
    official_email: 'amit.singh@forest.gov.in',
    employment_status: 'ACTIVE',
    registration_status: 'NOT_REGISTERED',
    is_active: true,
  },
  {
    employee_code: 'FD-HR-0004',
    full_name: 'Sunita Devi',
    dob: new Date('1985-07-30'),
    designation: 'Assistant Conservator',
    department: 'Forest Department',
    office: 'Range Office',
    district: 'Nagpur',
    registered_mobile: '9876543240',
    official_email: 'sunita.devi@forest.gov.in',
    employment_status: 'ACTIVE',
    registration_status: 'NOT_REGISTERED',
    is_active: true,
  },
  {
    employee_code: 'FD-HR-0005',
    full_name: 'Rohan Patil',
    dob: new Date('1995-01-12'),
    designation: 'Forest Guard',
    department: 'Forest Department',
    office: 'Wildlife Division',
    district: 'Mumbai',
    registered_mobile: '9876543250',
    official_email: 'rohan.patil@forest.gov.in',
    employment_status: 'ACTIVE',
    registration_status: 'NOT_REGISTERED',
    is_active: true,
  },
]

async function main() {
  await mongoose.connect('mongodb://localhost:27017/junglesathi')
  await EmployeeMaster.insertMany(employees)
  console.log('Seeded ' + employees.length + ' employees')
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
