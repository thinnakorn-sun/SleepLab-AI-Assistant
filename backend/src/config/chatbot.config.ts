import { registerAs } from '@nestjs/config';

export const chatbotConfig = registerAs('chatbot', () => ({
    /** ชื่อบอท (ใช้ในข้อความ) */
    botName: process.env.BOT_NAME || 'MOONi',
    /** เวลาทำการ แสดงในหน้าติดต่อเจ้าหน้าที่ (เช่น "จันทร์–ศุกร์ 08:00–17:00 น.") */
    businessHours: process.env.BUSINESS_HOURS || 'จันทร์–ศุกร์ 08:00–17:00 น.',
    /** คีย์เมนูติดต่อเจ้าหน้าที่ (ส่งเมื่อกดปุ่ม) */
    contactMenuKey: process.env.CONTACT_MENU_KEY || 'E',
    /** เมื่อ true จะ log chunks ที่ดึงมา + distance เพื่อเช็คความแม่นยำ RAG */
    ragDebug: process.env.RAG_DEBUG === 'true',
    /** เมื่อ true จะส่งคำตอบ FAQ เป็น Flex Message (bubble) แทน plain text */
    faqUseFlex: process.env.FAQ_USE_FLEX !== 'false',
    /** ลิงก์บทความ Sleep Hygiene (Low Risk screening) */
    sleepHygieneArticleUrl: process.env.SLEEP_HYGIENE_ARTICLE_URL || '',
}));
