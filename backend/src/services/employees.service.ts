import { randomUUID } from 'crypto';

export type EmployeeStatus = 'active' | 'on-leave' | 'terminated';

export interface Employee {
  id:          string;
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string | null;
  title:       string;
  department:  string;
  location:    string;
  status:      EmployeeStatus;
  hireDate:    string;
  managerId:   string | null;
  managerName: string | null;
  skills:      string[];
  avatarUrl:   string | null;
  bio:         string | null;
}

// ── Seed ──────────────────────────────────────────────────────────────────────

const employees = new Map<string, Employee>([
  ['emp-1', { id: 'emp-1', firstName: 'Alex',     lastName: 'Johnson',   email: 'alex.johnson@teamtalent.io',    phone: '+44 7700 900001', title: 'Head of People',           department: 'HR',          location: 'London, UK',        status: 'active',    hireDate: '2021-03-01', managerId: null,    managerName: null,            skills: ['HR Strategy', 'Recruitment', 'L&D', 'Employment Law'],                          avatarUrl: null, bio: 'Leads all people operations across the organisation.' }],
  ['emp-2', { id: 'emp-2', firstName: 'Sarah',     lastName: 'Chen',      email: 'sarah.chen@teamtalent.io',      phone: '+44 7700 900002', title: 'Senior Recruiter',         department: 'HR',          location: 'London, UK',        status: 'active',    hireDate: '2022-06-15', managerId: 'emp-1', managerName: 'Alex Johnson',  skills: ['Sourcing', 'Interviewing', 'Candidate Experience', 'ATS'],                      avatarUrl: null, bio: null }],
  ['emp-3', { id: 'emp-3', firstName: 'Marcus',    lastName: 'Williams',  email: 'marcus.williams@teamtalent.io', phone: '+44 7700 900003', title: 'VP Engineering',           department: 'Engineering', location: 'London, UK',        status: 'active',    hireDate: '2020-09-01', managerId: null,    managerName: null,            skills: ['Engineering Leadership', 'System Design', 'TypeScript', 'AWS'],                avatarUrl: null, bio: 'Oversees all engineering teams and technical strategy.' }],
  ['emp-4', { id: 'emp-4', firstName: 'Priya',     lastName: 'Patel',     email: 'priya.patel@teamtalent.io',     phone: '+44 7700 900004', title: 'Head of Product',          department: 'Product',     location: 'London, UK',        status: 'active',    hireDate: '2021-11-01', managerId: null,    managerName: null,            skills: ['Product Strategy', 'Roadmapping', 'OKRs', 'User Research'],                    avatarUrl: null, bio: null }],
  ['emp-5', { id: 'emp-5', firstName: 'James',     lastName: 'Okafor',    email: 'james.okafor@teamtalent.io',    phone: '+44 7700 900005', title: 'Recruiter',                department: 'HR',          location: 'London, UK',        status: 'active',    hireDate: '2023-02-01', managerId: 'emp-1', managerName: 'Alex Johnson',  skills: ['Candidate Sourcing', 'LinkedIn Recruiter', 'Screening'],                       avatarUrl: null, bio: null }],
  ['emp-6', { id: 'emp-6', firstName: 'Emily',     lastName: 'Torres',    email: 'emily.torres@teamtalent.io',    phone: '+44 7700 900006', title: 'Finance Director',         department: 'Finance',     location: 'London, UK',        status: 'active',    hireDate: '2021-05-10', managerId: null,    managerName: null,            skills: ['Financial Planning', 'Budgeting', 'FP&A', 'Excel'],                            avatarUrl: null, bio: null }],
  ['emp-7', { id: 'emp-7', firstName: 'David',     lastName: 'Kim',       email: 'david.kim@teamtalent.io',       phone: '+44 7700 900007', title: 'Senior Software Engineer', department: 'Engineering', location: 'Remote',            status: 'active',    hireDate: '2022-01-10', managerId: 'emp-3', managerName: 'Marcus Williams', skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],                                avatarUrl: null, bio: null }],
  ['emp-8', { id: 'emp-8', firstName: 'Olivia',    lastName: 'Nash',      email: 'olivia.nash@teamtalent.io',     phone: '+44 7700 900008', title: 'Product Manager',          department: 'Product',     location: 'London, UK',        status: 'active',    hireDate: '2022-08-22', managerId: 'emp-4', managerName: 'Priya Patel',   skills: ['Agile', 'Jira', 'Roadmapping', 'Stakeholder Management'],                     avatarUrl: null, bio: null }],
  ['emp-9', { id: 'emp-9', firstName: 'Ravi',      lastName: 'Mehta',     email: 'ravi.mehta@teamtalent.io',      phone: '+44 7700 900009', title: 'Data Engineer',            department: 'Engineering', location: 'New York, US',      status: 'active',    hireDate: '2023-04-03', managerId: 'emp-3', managerName: 'Marcus Williams', skills: ['Python', 'Spark', 'Airflow', 'dbt', 'BigQuery'],                               avatarUrl: null, bio: null }],
  ['emp-10', { id: 'emp-10', firstName: 'Zoe',     lastName: 'Adams',     email: 'zoe.adams@teamtalent.io',       phone: '+44 7700 900010', title: 'UX Lead',                  department: 'Design',      location: 'London, UK',        status: 'active',    hireDate: '2021-07-19', managerId: null,    managerName: null,            skills: ['Figma', 'User Research', 'Design Systems', 'Prototyping'],                    avatarUrl: null, bio: null }],
  ['emp-11', { id: 'emp-11', firstName: 'Noah',    lastName: 'Clarke',    email: 'noah.clarke@teamtalent.io',     phone: null,              title: 'Software Engineer',        department: 'Engineering', location: 'Remote',            status: 'active',    hireDate: '2023-09-11', managerId: 'emp-3', managerName: 'Marcus Williams', skills: ['Go', 'Kubernetes', 'Docker', 'AWS'],                                           avatarUrl: null, bio: null }],
  ['emp-12', { id: 'emp-12', firstName: 'Fatima',  lastName: 'Hassan',    email: 'fatima.hassan@teamtalent.io',   phone: '+44 7700 900012', title: 'Marketing Manager',        department: 'Marketing',   location: 'London, UK',        status: 'active',    hireDate: '2022-03-14', managerId: null,    managerName: null,            skills: ['Content Strategy', 'SEO', 'Paid Media', 'Brand'],                             avatarUrl: null, bio: null }],
  ['emp-13', { id: 'emp-13', firstName: 'Lucas',   lastName: 'Brown',     email: 'lucas.brown@teamtalent.io',     phone: '+44 7700 900013', title: 'Sales Manager',            department: 'Sales',       location: 'New York, US',      status: 'active',    hireDate: '2021-10-04', managerId: null,    managerName: null,            skills: ['B2B Sales', 'CRM', 'Pipeline Management', 'Negotiation'],                     avatarUrl: null, bio: null }],
  ['emp-14', { id: 'emp-14', firstName: 'Isabella', lastName: 'Wright',   email: 'isabella.wright@teamtalent.io', phone: '+44 7700 900014', title: 'Finance Analyst',          department: 'Finance',     location: 'London, UK',        status: 'active',    hireDate: '2023-01-16', managerId: 'emp-6', managerName: 'Emily Torres',  skills: ['Financial Modelling', 'Excel', 'PowerBI', 'Forecasting'],                     avatarUrl: null, bio: null }],
  ['emp-15', { id: 'emp-15', firstName: 'Ethan',   lastName: 'Scott',     email: 'ethan.scott@teamtalent.io',     phone: null,              title: 'Senior Software Engineer', department: 'Engineering', location: 'San Francisco, US', status: 'active',    hireDate: '2022-11-07', managerId: 'emp-3', managerName: 'Marcus Williams', skills: ['Python', 'FastAPI', 'PostgreSQL', 'Redis'],                                    avatarUrl: null, bio: null }],
  ['emp-16', { id: 'emp-16', firstName: 'Amara',   lastName: 'Diallo',    email: 'amara.diallo@teamtalent.io',    phone: '+44 7700 900016', title: 'UX Designer',              department: 'Design',      location: 'London, UK',        status: 'active',    hireDate: '2023-06-26', managerId: 'emp-10', managerName: 'Zoe Adams',    skills: ['Figma', 'Wireframing', 'User Testing', 'Accessibility'],                      avatarUrl: null, bio: null }],
  ['emp-17', { id: 'emp-17', firstName: 'Callum',  lastName: 'Hughes',    email: 'callum.hughes@teamtalent.io',   phone: '+44 7700 900017', title: 'DevOps Engineer',          department: 'Engineering', location: 'Remote',            status: 'on-leave', hireDate: '2022-05-02', managerId: 'emp-3', managerName: 'Marcus Williams', skills: ['Terraform', 'AWS', 'CI/CD', 'Linux', 'Monitoring'],                            avatarUrl: null, bio: null }],
  ['emp-18', { id: 'emp-18', firstName: 'Sofia',   lastName: 'Ruiz',      email: 'sofia.ruiz@teamtalent.io',      phone: '+44 7700 900018', title: 'Sales Executive',          department: 'Sales',       location: 'Austin, US',        status: 'active',    hireDate: '2023-08-14', managerId: 'emp-13', managerName: 'Lucas Brown',  skills: ['Prospecting', 'Demo Delivery', 'HubSpot', 'Closing'],                         avatarUrl: null, bio: null }],
  ['emp-19', { id: 'emp-19', firstName: 'Aaron',   lastName: 'Mwangi',    email: 'aaron.mwangi@teamtalent.io',    phone: '+44 7700 900019', title: 'Product Analyst',          department: 'Product',     location: 'London, UK',        status: 'active',    hireDate: '2024-01-08', managerId: 'emp-4', managerName: 'Priya Patel',   skills: ['SQL', 'Mixpanel', 'A/B Testing', 'Excel'],                                    avatarUrl: null, bio: null }],
  ['emp-20', { id: 'emp-20', firstName: 'Helena',  lastName: 'Ivanova',   email: 'helena.ivanova@teamtalent.io',  phone: null,              title: 'Marketing Analyst',        department: 'Marketing',   location: 'Remote',            status: 'active',    hireDate: '2024-03-04', managerId: 'emp-12', managerName: 'Fatima Hassan', skills: ['Google Analytics', 'SEO', 'Content', 'Reporting'],                             avatarUrl: null, bio: null }],
  ['emp-21', { id: 'emp-21', firstName: 'Jake',    lastName: 'Morrison',  email: 'jake.morrison@teamtalent.io',   phone: '+44 7700 900021', title: 'Customer Success Manager', department: 'Sales',       location: 'London, UK',        status: 'active',    hireDate: '2022-09-19', managerId: 'emp-13', managerName: 'Lucas Brown',  skills: ['Customer Relationships', 'Onboarding', 'Churn Prevention', 'Salesforce'],     avatarUrl: null, bio: null }],
  ['emp-22', { id: 'emp-22', firstName: 'Maya',    lastName: 'Johansson', email: 'maya.johansson@teamtalent.io',  phone: '+44 7700 900022', title: 'L&D Specialist',           department: 'HR',          location: 'London, UK',        status: 'active',    hireDate: '2023-11-06', managerId: 'emp-1', managerName: 'Alex Johnson',  skills: ['Training Design', 'LMS', 'Facilitation', 'CIPD'],                              avatarUrl: null, bio: null }],
  ['emp-23', { id: 'emp-23', firstName: 'Victor',  lastName: 'Santos',    email: 'victor.santos@teamtalent.io',   phone: '+44 7700 900023', title: 'Backend Engineer',         department: 'Engineering', location: 'San Francisco, US', status: 'terminated',hireDate: '2021-04-12', managerId: 'emp-3', managerName: 'Marcus Williams', skills: ['Java', 'Spring Boot', 'Microservices', 'Kafka'],                               avatarUrl: null, bio: null }],
  ['emp-24', { id: 'emp-24', firstName: 'Grace',   lastName: 'Obi',       email: 'grace.obi@teamtalent.io',       phone: '+44 7700 900024', title: 'Data Analyst',             department: 'Engineering', location: 'London, UK',        status: 'active',    hireDate: '2024-02-19', managerId: 'emp-3', managerName: 'Marcus Williams', skills: ['SQL', 'Python', 'Tableau', 'dbt'],                                             avatarUrl: null, bio: null }],
]);

// ── Service ───────────────────────────────────────────────────────────────────

export const employeesService = {
  getAll(params: { search?: string; department?: string; location?: string; status?: EmployeeStatus }): Employee[] {
    let list = Array.from(employees.values());
    if (params.search) {
      const q = params.search.toLowerCase();
      list = list.filter((e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q),
      );
    }
    if (params.department && params.department !== 'all') {
      list = list.filter((e) => e.department === params.department);
    }
    if (params.location && params.location !== 'all') {
      list = list.filter((e) => e.location === params.location);
    }
    if (params.status) {
      list = list.filter((e) => e.status === params.status);
    }
    return list.sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`));
  },

  getById(id: string): Employee | null {
    return employees.get(id) ?? null;
  },

  getDepartments(): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const e of employees.values()) {
      if (!seen.has(e.department)) { seen.add(e.department); result.push(e.department); }
    }
    return result.sort();
  },

  getLocations(): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const e of employees.values()) {
      if (!seen.has(e.location)) { seen.add(e.location); result.push(e.location); }
    }
    return result.sort();
  },

  create(data: {
    firstName: string; lastName: string; email: string; phone?: string;
    title: string; department: string; location: string;
    hireDate: string; managerId?: string; skills?: string[]; bio?: string;
  }): Employee {
    const id = `emp-${randomUUID().slice(0, 8)}`;
    const manager = data.managerId ? employees.get(data.managerId) : null;
    const employee: Employee = {
      id,
      firstName:   data.firstName,
      lastName:    data.lastName,
      email:       data.email,
      phone:       data.phone ?? null,
      title:       data.title,
      department:  data.department,
      location:    data.location,
      status:      'active',
      hireDate:    data.hireDate,
      managerId:   data.managerId ?? null,
      managerName: manager ? `${manager.firstName} ${manager.lastName}` : null,
      skills:      data.skills ?? [],
      avatarUrl:   null,
      bio:         data.bio ?? null,
    };
    employees.set(id, employee);
    return employee;
  },

  update(id: string, patch: Partial<Omit<Employee, 'id'>>): Employee | null {
    const emp = employees.get(id);
    if (!emp) return null;
    Object.assign(emp, patch);
    return emp;
  },

  exportCsv(): string {
    const header = 'ID,First Name,Last Name,Email,Phone,Title,Department,Location,Status,Hire Date,Manager';
    const rows = Array.from(employees.values()).map((e) =>
      [e.id, e.firstName, e.lastName, e.email, e.phone ?? '', e.title, e.department, e.location, e.status, e.hireDate, e.managerName ?? ''].join(','),
    );
    return [header, ...rows].join('\n');
  },
};
