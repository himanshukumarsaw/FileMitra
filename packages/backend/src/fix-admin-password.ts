import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from './models/User.js'

async function main() {
  await mongoose.connect('mongodb://localhost:27017/junglesathi')
  const hash = await bcrypt.hash('Admin@2026!Secure', 10)
  const user = await User.findById('6a832a418b2a99073df94c16')
  if (!user) {
    console.log('User not found')
    await mongoose.disconnect()
    return
  }
  await User.findByIdAndUpdate(user._id, { password: hash })
  console.log('Password fixed for admin user')
  await mongoose.disconnect()
}

main().catch(console.error)
