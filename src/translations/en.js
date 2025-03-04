export default {
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    warning: 'Warning',
    add: 'Add',
    ok: 'OK',
    noGuardsFound: 'No guards found',
    save: 'Save',
    minutes: 'minutes',
    logout: 'Logout',
    delete: 'Delete',
    edit: 'Edit',
    appTitle: 'Security Tracker App',
  },
  auth: {
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    passwordTooShort: 'Password must be at least 6 characters long',
    invalidEmail: 'Please enter a valid email address',
    name: 'Full Name',
    companyName: 'Company Name',
    registerAsAdmin: 'Register as Company Admin',
    registerAsGuard: 'Register as Security Guard',
    registerAsGuardOrAdmin: 'Register as Admin',
    backToLogin: 'Back to Login',
    approvalCode: 'Approval Code',
    fillAllFields: 'Please fill in all fields',
    userNotFound: 'User data not found',
    companyNotFound: 'Company data not found',
    invalidApprovalCode: 'Invalid approval code',
    companyExists: 'This company exists. You will need an approval code to register as an admin.',
    invalidMinutes: 'Please enter a valid number of minutes',
    companyCreated: 'Account created successfully',
    approvalCodeCopied: 'Approval code copied to clipboard',
    saveApprovalCode: "Please save this code! You'll need it to add more administrators to your company.",
    iveSavedTheCode: "I've Saved the Code",
    passwordsDoNotMatch: 'Passwords do not match',
    enterCompanyName: 'Please enter a company name',
    enterApprovalCode: 'Please enter the company approval code',
    verifyCompanyError: 'Failed to verify company information',
    yourCompanyApprovalCode: 'Your company approval code is:',
    tapToCopy: '(Tap to copy)',
  },
  guard: {
    securityRounds: 'Security Rounds',
    checkpoints: 'Checkpoints',
    timeWindow: 'Time Window',
    lateWindow: 'Late Window',
    checkLocation: 'Check Location',
    distance: 'Distance',
    timeRemaining: 'Time Remaining',
    lateWindowRemaining: 'Late Window Remaining',
    noCheckpoints: 'No checkpoints found',
    permissionDenied: 'Permission Denied',
    locationPermissionRequired: 'Location permission is required',
    locationError: 'Location Error',
    tooFarFromCheckpoint: 'You are too far from the checkpoint ({{distance}} meters away). Must be within {{radius}} meters.',
    timeWindowError: 'Time Window Error',
    tooEarly: 'Too early to verify this checkpoint.',
    timeExpired: 'Time window has expired including late window.',
    checkpointVerified: 'Checkpoint verified successfully',
    checkpointVerifiedLate: 'Checkpoint verified (Late)',
    verificationError: 'Failed to verify checkpoint: {{message}}',
    status: 'Status',
    verified: 'Verified',
    notVerified: 'Not Verified',
    maximumDistance: 'Maximum Distance: {{radius}} meters',
    currentDistance: 'Current Distance: {{distance}} meters',
    tooFar: '(Too far)',
    recurringEvery: 'Recurs every {{hours}} hours',
    verify: 'Verify'
  },
  admin: {
    dashboard: 'Admin Dashboard',
    manageCheckpoints: 'Manage Checkpoints',
    monitorGuards: 'Monitor Guards',
    companySettings: 'Company Settings',
    guards: 'Guards',
    activeCheckpoints: 'Active Checkpoints',
    addNewCheckpoint: 'Add New Checkpoint',
    checkpointName: 'Checkpoint Name',
    recurrenceHours: 'Recurrence (hours, 0 for none)',
    startTime: 'Start Time: {{time}}',
    endTime: 'End Time: {{time}}',
    performanceSummary: 'Performance Summary',
    checkpointStatus: 'Checkpoint Status',
    checkpoints: 'Checkpoints',
    companyCreated: 'Company Created',
    lateWindowMinutes: 'Late Window (minutes)',
    enterMinutes: 'Enter minutes',
    lateWindow: 'Late Window',
    editSettings: 'Edit Settings'
  },
  status: {
    verified_ontime: 'Verified On Time',
    verified_late: 'Verified Late',
    onTime: 'On Time',
    late: 'Late',
    missed: 'Missed',
    upcoming: 'Upcoming',
    active: 'Active',
    late_verifiable: 'Late Verifiable'
  },
  location: {
    permissionDenied: 'Location permission is required',
    tooFar: 'You are too far from the checkpoint ({distance} meters away). Must be within {radius} meters.',
    checkFirst: 'Please check your location first',
    getFailed: 'Failed to get location'
  },
  time: {
    tooEarly: 'Too early to verify this checkpoint.',
    expired: 'Time window has expired including late window.',
    verifiedLate: 'Checkpoint verified (Late)',
    verifiedSuccess: 'Checkpoint verified successfully'
  }
}