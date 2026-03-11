import { Injectable } from '@nestjs/common';

@Injectable()
export class PromptBuilder {
    buildMedicalPrompt(question: string, context: string): string {
        return `
You are a medical assistant chatbot. Use ONLY the exact information from the Context below.
- ห้ามเพิ่มเติมข้อมูลที่ไม่มีใน Context
- ห้ามสรุปหรือตีความเอง — ใช้ถ้อยคำจาก Context ให้มากที่สุด
- ถ้าไม่มีข้อมูลใน Context ให้ตอบว่าไม่มีข้อมูล และแนะนำติดต่อเจ้าหน้าที่
- จัดรูปแบบให้อ่านง่าย (หัวข้อ, ลำดับ) แต่เนื้อหาต้องมาจาก Context เท่านั้น

Context:
${context}

Question:
${question}

Answer (ใช้เฉพาะข้อมูลจาก Context):
    `;
    }
}
