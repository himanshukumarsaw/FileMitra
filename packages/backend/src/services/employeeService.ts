import { EmployeeMaster } from '../models/EmployeeMaster.js';
import { AppError } from '../middleware/error.js';

export async function verifyEmployee(employeeCode: string, dob: Date, mobileLast4?: string) {
  const employee = await EmployeeMaster.findOne({ employee_code: employeeCode });

  if (!employee) {
    throw new AppError('Employee details could not be verified. Please check your Employee ID or contact the department administrator.', 404);
  }

  if (employee.employment_status !== 'ACTIVE') {
    throw new AppError('Your employee account is currently not eligible for portal registration. Please contact your department administrator.', 403);
  }

  const employeeDob = new Date(employee.dob);
  const inputDob = new Date(dob);

  if (
    employeeDob.getFullYear() !== inputDob.getFullYear() ||
    employeeDob.getMonth() !== inputDob.getMonth() ||
    employeeDob.getDate() !== inputDob.getDate()
  ) {
    throw new AppError('Employee details could not be verified. Please check your Employee ID or contact the department administrator.', 404);
  }

  const registeredMobile = String(employee.registered_mobile);
  const last4 = registeredMobile.slice(-4);

  if (mobileLast4 && last4 !== mobileLast4) {
    throw new AppError('Employee details could not be verified. Please check your Employee ID or contact the department administrator.', 404);
  }

  const { registered_mobile, ...safeEmployee } = employee.toObject();

  return {
    employeeCode: safeEmployee.employee_code,
    fullName: safeEmployee.full_name,
    dob: safeEmployee.dob,
    designation: safeEmployee.designation,
    department: safeEmployee.department,
    office: safeEmployee.office,
    officialEmail: safeEmployee.official_email,
    employmentStatus: safeEmployee.employment_status,
    registrationStatus: safeEmployee.registration_status,
  };
}

export async function getEmployeeByCode(employeeCode: string) {
  const employee = await EmployeeMaster.findOne({ employee_code: employeeCode });

  if (!employee) {
    throw new AppError('Employee not found', 404);
  }

  const { registered_mobile, ...safeEmployee } = employee.toObject();

  return {
    employeeCode: safeEmployee.employee_code,
    fullName: safeEmployee.full_name,
    dob: safeEmployee.dob,
    designation: safeEmployee.designation,
    department: safeEmployee.department,
    office: safeEmployee.office,
    officialEmail: safeEmployee.official_email,
    employmentStatus: safeEmployee.employment_status,
    registrationStatus: safeEmployee.registration_status,
  };
}
