export default {
  common: {
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    cancel: 'Vazgeç',
    add: 'Ekle',
    noGuardsFound: 'Güvenlik görevlisi kaydı bulunamadı',
    save: 'Kaydet',
    minutes: 'dakika',
    logout: 'Oturumu Kapat',
    warning: 'Dikkat',
    delete: 'Sil',
    edit: 'Düzenle',
    appTitle: 'Güvenlik Takip Sistemi',
  },
  auth: {
    login: 'Oturum Aç',
    register: 'Hesap Oluştur',
    email: 'E-posta',
    password: 'Parola',
    confirmPassword: 'Parolayı Tekrar Girin',
    passwordTooShort: 'Parola en az 6 karakter olmalıdır',
    invalidEmail: 'Geçerli bir e-posta adresi giriniz',
    name: 'Ad Soyad',
    companyName: 'Şirket Adı',
    registerAsAdmin: 'Yönetici Olarak Kaydol',
    registerAsGuard: 'Güvenlik Görevlisi Olarak Kaydol',
    registerAsGuardOrAdmin: 'Yönetici Olarak Kaydol',
    backToLogin: 'Giriş Sayfasına Dön',
    approvalCode: 'Onay Kodu',
    fillAllFields: 'Tüm alanları doldurunuz',
    userNotFound: 'Kullanıcı bulunamadı',
    companyNotFound: 'Şirket bulunamadı',
    invalidApprovalCode: 'Onay kodu geçersiz',
    companyExists: 'Bu şirket sistemde kayıtlı. Yönetici olarak kaydolmak için onay kodu gereklidir.',
    invalidMinutes: 'Geçerli bir dakika değeri giriniz',
    companyCreated: 'Hesabınız başarıyla oluşturuldu',
    approvalCodeCopied: 'Onay kodu kopyalandı',
    saveApprovalCode: "Lütfen bu kodu kaydediniz! Şirketinize yeni yöneticiler eklemek için bu koda ihtiyacınız olacak.",
    iveSavedTheCode: "Kodu Kaydettim",
    passwordsDoNotMatch: "Parolalar eşleşmiyor",
    enterCompanyName: 'Şirket adını giriniz',
    enterApprovalCode: 'Şirket onay kodunu giriniz',
    verifyCompanyError: 'Şirket bilgileri doğrulanamadı',
    yourCompanyApprovalCode: 'Şirket onay kodunuz:',
    tapToCopy: '(Kopyalamak için tıklayın)',
  },
  guard: {
    securityRounds: 'Devriye Noktaları',
    checkpoints: 'Kontrol Noktaları',
    timeWindow: 'Zaman Dilimi',
    lateWindow: 'Tolerans Süresi',
    verify: 'Onayla',
    checkLocation: 'Konum Kontrolü',
    distance: 'Mesafe',
    currentDistance: 'Mevcut Mesafe',
    timeRemaining: 'Kalan Süre',
    lateWindowRemaining: 'Kalan Tolerans Süresi',
    noCheckpoints: 'Kontrol noktası bulunmamakta',
    permissionDenied: 'İzin Reddedildi',
    locationPermissionRequired: 'Konum izni gerekli',
    locationError: 'Konum Hatası',
    tooFarFromCheckpoint: 'Kontrol noktasından çok uzaktasınız ({{distance}} metre uzakta). {{radius}} metre içinde olmalısınız.',
    timeWindowError: 'Zaman Aralığı Hatası',
    tooEarly: 'Bu kontrol noktasını doğrulamak için çok erken.',
    timeExpired: 'Zaman aralığı geç kalma süresi dahil sona erdi.',
    checkpointVerified: 'Kontrol noktası başarıyla doğrulandı',
    checkpointVerifiedLate: 'Kontrol noktası doğrulandı (Geç)',
    verificationError: 'Kontrol noktası doğrulanamadı: {{message}}',
    status: 'Durum',
    verified: 'Doğrulandı',
    notVerified: 'Doğrulanmadı',
    maximumDistance: 'Maksimum Mesafe: {{radius}} metre',
    currentDistance: 'Mevcut Mesafe: {{distance}} metre',
    tooFar: '(Çok uzak)',
    recurringEvery: 'Her {{hours}} saatte bir tekrarlanır'
  },
  admin: {
    dashboard: 'Kontrol Paneli',
    manageCheckpoints: 'Kontrol Noktası Yönetimi',
    monitorGuards: 'Güvenlik Görevlisi Takibi',
    companySettings: 'Şirket Ayarları',
    activeCheckpoints: 'Aktif Kontrol Noktaları',
    addNewCheckpoint: 'Yeni Kontrol Noktası Ekle',
    checkpointName: 'Kontrol Noktası Adı',
    recurrenceHours: 'Tekrar Sıklığı (saat, 0 = tekrar yok)',
    startTime: 'Başlangıç: {{time}}',
    endTime: 'Bitiş: {{time}}',
    performanceSummary: 'Performans Özeti',
    checkpointStatus: 'Kontrol Noktası Durumu',
    guards: 'Güvenlik Görevlileri',
    checkpoints: 'Kontrol Noktaları',
    companyCreated: 'Şirket kuruluş tarihi',
    lateWindowMinutes: 'Tolerans Süresi (dakika)',
    enterMinutes: 'Dakika giriniz',
    lateWindow: 'Tolerans Süresi',
    editSettings: 'Ayarları Düzenle'
  },
  status: {
    verified_ontime: 'Zamanında Onaylandı',
    verified_late: 'Geç Onaylandı',
    onTime: 'Zamanında',
    late: 'Geç',
    missed: 'Kaçırıldı',
    upcoming: 'Yaklaşan',
    active: 'Aktif',
    late_verifiable: 'Geç Onaylanabilir'
  },
  location: {
    permissionDenied: 'Konum izni gereklidir',
    tooFar: 'Kontrol noktasına çok uzaktasınız ({distance} metre). En fazla {radius} metre uzaklıkta olmalısınız.',
    checkFirst: 'Önce konumunuzu kontrol ediniz',
    getFailed: 'Konum bilgisi alınamadı'
  },
  time: {
    tooEarly: 'Bu kontrol noktası için henüz erken.',
    expired: 'Tolerans süresi dahil zaman aralığı sona erdi.',
    verifiedLate: 'Kontrol noktası geç onaylandı',
    verifiedSuccess: 'Kontrol noktası onaylandı'
  }
}