import mongoose from 'mongoose'
import { User } from './models/User.js'
import { EmployeeMaster } from './models/EmployeeMaster.js'

async function main() {
  await mongoose.connect('mongodb://localhost:27017/junglesathi')
  const user = await User.findOne({ employee_code: 'FD-ADMIN-001' })
  console.log('User:', user ? { id: user._id, email: user.email, role: user.role, employee_code: user.employee_code, hasPassword: !!user.password } : 'not found')
  const emp = await EmployeeMaster.findOne({ employee_code: 'FD-ADMIN-001' })
  console.log('Employee:', emp ? { code: emp.employee_code, name: emp.full_name, status: emp.employment_status, regStatus: emp.registration_status } : 'not found')
  await mongoose.disconnect()
}

main().catch(console.error)
