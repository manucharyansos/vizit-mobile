export type Locale = 'hy' | 'ru' | 'en';

const en = {
  discover: 'Discover', bookings: 'Bookings', profile: 'Profile', services: 'Services', staff: 'Specialists', address: 'Address',
  tagline: 'Book your time beautifully', heroTitle: 'Find the right service and book in minutes', search: 'Search businesses or services', mapNative: 'Native Yandex map',
  loadError: 'Could not load data. Please try again.', empty: 'Nothing found', bookNow: 'Book now', chooseService: 'Choose a service', chooseStaff: 'Choose a specialist',
  chooseDate: 'Choose a date', chooseTime: 'Choose a time', anyStaff: 'Any available specialist', recommended: 'Recommended', continue: 'Continue', back: 'Back',
  customerDetails: 'Your details', fullName: 'Full name', phone: 'Phone number', email: 'Email', notes: 'Notes (optional)', confirmBooking: 'Confirm booking',
  bookingSuccess: 'Booking request created', bookingOtpHint: 'Enter the 4-digit verification code sent to you to open or change the booking.',
  bookingsBody: 'Your verified bookings will appear here. Enter the 4-digit verification code sent to you to manage the latest booking.', profileBody: 'Sign in as a client or switch to your business workspace.',
  businessMode: 'Business workspace', customerMode: 'Back to customer app', businessToday: "Today's calendar", businessBody: 'Business and employee accounts have an isolated authentication audience and secure token storage.',
} as const;
export type TranslationKey = keyof typeof en;

export const translations: Record<Locale, Record<TranslationKey, string>> = {
  en,
  hy: {
    discover: 'Բացահայտել', bookings: 'Ամրագրումներ', profile: 'Պրոֆիլ', services: 'Ծառայություններ', staff: 'Մասնագետներ', address: 'Հասցե',
    tagline: 'Ամրագրիր քո ժամանակը գեղեցիկ', heroTitle: 'Գտիր ճիշտ ծառայությունը և ամրագրիր րոպեների ընթացքում', search: 'Որոնել բիզնես կամ ծառայություն', mapNative: 'Native Yandex քարտեզ',
    loadError: 'Չհաջողվեց բեռնել տվյալները։ Փորձիր կրկին։', empty: 'Ոչինչ չի գտնվել', bookNow: 'Ամրագրել հիմա', chooseService: 'Ընտրիր ծառայությունը', chooseStaff: 'Ընտրիր մասնագետին',
    chooseDate: 'Ընտրիր ամսաթիվը', chooseTime: 'Ընտրիր ազատ ժամը', anyStaff: 'Ցանկացած ազատ մասնագետ', recommended: 'Առաջարկվող', continue: 'Շարունակել', back: 'Հետ',
    customerDetails: 'Քո տվյալները', fullName: 'Անուն ազգանուն', phone: 'Հեռախոսահամար', email: 'Էլ․ փոստ', notes: 'Նշումներ (ոչ պարտադիր)', confirmBooking: 'Հաստատել ամրագրումը',
    bookingSuccess: 'Ամրագրման հարցումը ստեղծվեց', bookingOtpHint: 'Ամրագրումը բացելու կամ փոխելու համար մուտքագրիր քեզ ուղարկված 4-նիշ հաստատման կոդը։',
    bookingsBody: 'Այստեղ կերևան հաստատված ամրագրումները։ Վերջին ամրագրումը կառավարելու համար մուտքագրիր քեզ ուղարկված 4-նիշ հաստատման կոդը։', profileBody: 'Մուտք գործիր որպես հաճախորդ կամ անցիր բիզնես աշխատանքային բաժին։',
    businessMode: 'Բիզնես բաժին', customerMode: 'Վերադառնալ հաճախորդի բաժին', businessToday: 'Այսօրվա օրացույց', businessBody: 'Բիզնեսի և աշխատակցի հաշիվներն ունեն առանձին authentication audience և անվտանգ token պահեստ։',
  },
  ru: {
    discover: 'Поиск', bookings: 'Записи', profile: 'Профиль', services: 'Услуги', staff: 'Специалисты', address: 'Адрес',
    tagline: 'Записывайтесь красиво', heroTitle: 'Найдите нужную услугу и запишитесь за минуты', search: 'Найти бизнес или услугу', mapNative: 'Нативная карта Яндекс',
    loadError: 'Не удалось загрузить данные. Попробуйте снова.', empty: 'Ничего не найдено', bookNow: 'Записаться', chooseService: 'Выберите услугу', chooseStaff: 'Выберите специалиста',
    chooseDate: 'Выберите дату', chooseTime: 'Выберите время', anyStaff: 'Любой свободный специалист', recommended: 'Рекомендуем', continue: 'Продолжить', back: 'Назад',
    customerDetails: 'Ваши данные', fullName: 'Имя и фамилия', phone: 'Номер телефона', email: 'Эл. почта', notes: 'Комментарий (необязательно)', confirmBooking: 'Подтвердить запись',
    bookingSuccess: 'Запись создана', bookingOtpHint: 'Чтобы открыть или изменить запись, введите отправленный вам 4-значный код подтверждения.',
    bookingsBody: 'Здесь появятся подтверждённые записи. Для управления последней записью введите отправленный вам 4-значный код подтверждения.', profileBody: 'Войдите как клиент или перейдите в рабочее пространство бизнеса.',
    businessMode: 'Раздел бизнеса', customerMode: 'Вернуться к клиентам', businessToday: 'Календарь на сегодня', businessBody: 'Аккаунты бизнеса и сотрудников используют отдельный authentication audience и защищённое хранилище токенов.',
  },
};
