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
exports.GreetingHandler = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const oa_settings_service_1 = require("../services/oa-settings.service");
const flex_templates_1 = require("../../line/flex-templates");
let GreetingHandler = class GreetingHandler {
    constructor(oaSettingsService, configService) {
        this.oaSettingsService = oaSettingsService;
        this.configService = configService;
    }
    async handle(_message, context) {
        const centerName = await this.oaSettingsService.getCenterName(context.lineOaId);
        const botName = this.configService.get('chatbot.botName');
        return (0, flex_templates_1.createGreetingFlex)(centerName, { botName });
    }
};
exports.GreetingHandler = GreetingHandler;
exports.GreetingHandler = GreetingHandler = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [oa_settings_service_1.OASettingsService,
        config_1.ConfigService])
], GreetingHandler);
//# sourceMappingURL=greeting.handler.js.map