"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptBuilder = void 0;
const common_1 = require("@nestjs/common");
let PromptBuilder = class PromptBuilder {
    buildMedicalPrompt(question, context) {
        return `
คุณเป็นผู้ช่วยแชทบอทด้านการนอนหลับ ตอบจากข้อมูลใน Context เท่านั้น

กฎสำคัญ:
- ใช้เฉพาะข้อมูลที่มีใน Context ห้ามเพิ่มเติมหรือตีความเอง
- ถ้าไม่มีข้อมูลใน Context ให้ตอบว่าไม่มีข้อมูล และแนะนำติดต่อเจ้าหน้าที่

รูปแบบคำตอบ (สำหรับ LINE Chatbot — แสดงเป็น plain text):
1. ใช้สำนวนเป็นธรรมชาติ ลงท้ายด้วย ค่ะ นะคะ ครับ
2. แยกย่อหน้าให้สั้น อ่านง่าย — ไม่เกิน 2-3 บรรทัดต่อย่อหน้า
3. รายการหลายข้อ: ใช้ • นำหน้า หรือ ①②③
4. ห้ามใช้ markdown (**, ##, ###) — LINE ไม่รองรับ ให้ใช้ตัวอักษร/สัญลักษณ์แทน
5. หัวข้อสำคัญ: ใช้ emoji นำ เช่น 📌 • ✅ ถ้าช่วยให้อ่านง่าย (ใช้พอประมาณ)
6. สรุปสั้นๆ 1-2 ประโยคท้ายข้อความ ถ้ามีหลายส่วน
7. ใช้บรรทัดว่างระหว่างย่อหน้าเพื่อให้อ่านสบายตา

Context:
${context}

Question:
${question}

Answer (ใช้เฉพาะข้อมูลจาก Context จัดรูปแบบตามด้านบน):
    `;
    }
};
exports.PromptBuilder = PromptBuilder;
exports.PromptBuilder = PromptBuilder = __decorate([
    (0, common_1.Injectable)()
], PromptBuilder);
//# sourceMappingURL=prompt.builder.js.map