"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FAQHandler = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const faq_service_1 = require("../services/faq.service");
const flex_templates_1 = require("../../line/flex-templates");
let FAQHandler = class FAQHandler {
    constructor(faqService, configService) {
        this.faqService = faqService;
        this.configService = configService;
    }
    async handle(message, context) {
        const answer = await this.faqService.answer(message, context);
        const useFlex = this.configService.get('chatbot.faqUseFlex') !== false;
        if (useFlex) {
            return (0, flex_templates_1.createFAQFlex)(answer);
        }
        return answer;
    }
};
exports.FAQHandler = FAQHandler;
exports.FAQHandler = FAQHandler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [faq_service_1.FAQService,
        config_1.ConfigService])
], FAQHandler);
//# sourceMappingURL=faq.handler.js.map