import mongoose from 'mongoose'
import { EmployeeMaster } from './models/EmployeeMaster.js'
import { User } from './models/User.js'
import bcrypt from 'bcryptjs'

async function main() {
  await mongoose.connect('mongodb://localhost:27017/junglesathi')

  const adminEmployee = await EmployeeMaster.findOne({ employee_code: 'FD-ADMIN-001' })
  if (!adminEmployee) {
    await EmployeeMaster.create({
      employee_code: 'FD-ADMIN-001',
      full_name: 'Admin User',
      dob: new Date('1980-01-01'),
      designation: 'System Administrator',
      department: 'Forest Department',
      office: 'Head Office',
      district: 'Central',
      registered_mobile: '9999999999',
      official_email: 'admin@forest.gov.in',
      employment_status: 'ACTIVE',
      registration_status: 'REGISTERED',
      is_active: true,
    })
    console.log('Created admin employee')
  }

  const existingAdmin = await User.findOne({ employee_code: 'FD-ADMIN-001' })
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@2026!Secure', 10)
    await User.create({
      email: 'admin@forest.gov.in',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
      employee_code: 'FD-ADMIN-001',
      is_employee_portal: true,
    })
    console.log('Created admin user account')
  }

  await mongoose.disconnect()
  console.log('Admin setup complete')
}

main().catch((err) => {
  console.error('Admin setup failed:', err)
  process.exit(1)
})
