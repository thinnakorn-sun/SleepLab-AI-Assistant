/**
 * LINE Flex Message Templates
 * ใช้สร้างข้อความแบบ card/bubble ให้ดูสวยขึ้น
 * @see https://developers.line.biz/en/docs/messaging-api/using-flex-messages/
 */

export interface FlexReply {
    flex: {
        altText: string;
        contents: object;
    };
}

/**
 * สร้าง Flex Message สำหรับ Greeting (ข้อความต้อนรับ)
 * เมื่อลูกค้าแอดไลน์ หรือกดเริ่มใช้งานครั้งแรก
 * หมายเหตุ: Rich Menu ตั้งค่าแยกใน LINE Developers — เราไม่ยุ่งกับ Rich Menu
 */
export function createGreetingFlex(
    centerName: string,
    options?: { botName?: string; headerLine?: string },
): FlexReply {
    const botName = options?.botName ?? 'MOONi';
    const customHeader = options?.headerLine?.trim();
    const headerText =
        customHeader ??
        (() => {
            const welcome = centerName?.trim() ? `ยินดีต้อนรับสู่ ${centerName}` : 'ยินดีต้อนรับค่ะ';
            return `สวัสดีค่ะ ${welcome}`;
        })();
    const altText = `${headerText} 🌙`;
    return {
        flex: {
            altText,
            contents: {
                type: 'bubble',
                styles: {
                    header: { backgroundColor: '#2c5282' },
                    body: { backgroundColor: '#ffffff' },
                    footer: { backgroundColor: '#f7fafc' },
                },
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `${headerText} 🌙`,
                            weight: 'bold',
                            size: 'lg',
                            color: '#ffffff',
                            wrap: true,
                            align: 'center',
                        },
                    ],
                    paddingAll: 'md',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `${botName} (มู-นี่) ผู้ช่วยอัจฉริยะดูแลคุณภาพการนอนหลับของคุณค่ะ ✨`,
                            weight: 'bold',
                            size: 'md',
                            wrap: true,
                            color: '#2c5282',
                        },
                        {
                            type: 'text',
                            text: `${botName} ถูกสร้างขึ้นเพื่อดูแลให้ทุกค่ำคืนของคุณเป็นการพักผ่อนที่ดีที่สุด ด้วยมาตรฐานทางการแพทย์ (Medical-safe) ค่ะ ไม่ว่าจะเป็นเรื่องอาการนอนกรน การตรวจ Sleep Test หรือการดูแลผู้สูงอายุ`,
                            size: 'sm',
                            wrap: true,
                            color: '#4a5568',
                            margin: 'sm',
                        },
                        {
                            type: 'text',
                            text: `วันนี้ให้ ${botName} ดูแลเรื่องไหนดีคะ?`,
                            size: 'sm',
                            weight: 'bold',
                            color: '#2d3748',
                            margin: 'md',
                        },
                    ],
                    paddingAll: 'lg',
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        createMenuButton('A', '🛌 ประเมินความเสี่ยง (นอนกรน/หยุดหายใจ?)', 'primary'),
                        createMenuButton('B', '🏥 รู้จักบริการ Sleep Lab & นัดหมาย', 'secondary'),
                        createMenuButton('C', '⚙️ ปรึกษาปัญหา CPAP / หน้ากาก', 'secondary'),
                        createMenuButton('D', '👵 ดูแลการนอนผู้สูงอายุ', 'secondary'),
                        createMenuButton('E', '💬 ติดต่อเจ้าหน้าที่', 'secondary'),
                    ],
                    spacing: 'sm',
                    paddingAll: 'lg',
                },
            },
        },
    };
}

function createMenuButton(text: string, label: string, style: 'primary' | 'secondary' = 'primary') {
    return {
        type: 'button',
        action: { type: 'message', label, text },
        style,
    };
}

/** สร้าง Flex Message สำหรับผล Screening (High/Low risk) */
export function createScreeningResultFlex(
    isHighRisk: boolean,
    message: string,
    contactMenuKey: string = 'E',
    options?: { sleepHygieneArticleUrl?: string },
): FlexReply {
    const title = isHighRisk ? '⚠️ ผลการประเมินเบื้องต้น' : '✅ ผลการประเมินเบื้องต้น';
    const bgColor = isHighRisk ? '#fff5f5' : '#f0fff4';
    const bodyContents: object[] = [
        {
            type: 'text',
            text: message,
            size: 'sm',
            wrap: true,
            color: '#333333',
        },
    ];
    if (isHighRisk) {
        bodyContents.push({
            type: 'box',
            layout: 'vertical',
            contents: [
                {
                    type: 'button',
                    action: {
                        type: 'postback',
                        label: 'ดูแพ็กเกจ Sleep Test',
                        data: 'SCREENING_SLEEP_PACKAGE',
                        displayText: 'ดูแพ็กเกจ Sleep Test',
                    },
                    style: 'primary',
                    margin: 'md',
                },
                {
                    type: 'button',
                    action: { type: 'message', label: 'ติดต่อเจ้าหน้าที่', text: contactMenuKey },
                    style: 'secondary',
                    margin: 'sm',
                },
            ],
            margin: 'lg',
        });
    } else if (options?.sleepHygieneArticleUrl) {
        bodyContents.push({
            type: 'button',
            action: {
                type: 'uri',
                label: '📖 อ่านบทความ Sleep Hygiene',
                uri: options.sleepHygieneArticleUrl,
            },
            style: 'primary',
            margin: 'md',
        });
    }
    return {
        flex: {
            altText: title,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: title,
                            weight: 'bold',
                            size: 'md',
                            color: isHighRisk ? '#c53030' : '#276749',
                            wrap: true,
                        },
                    ],
                    backgroundColor: bgColor,
                    paddingAll: 'md',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: bodyContents,
                    paddingAll: 'lg',
                },
            },
        },
    };
}

/** สร้าง Flex Message สำหรับคำตอบ FAQ — ใส่ข้อความใน bubble ให้อ่านง่าย */
export function createFAQFlex(text: string, altText?: string): FlexReply {
    const display = text.slice(0, 5000); // LINE limit
    const preview = display.slice(0, 60).replace(/\n/g, ' ');
    return {
        flex: {
            altText: altText ?? preview + (text.length > 60 ? '...' : ''),
            contents: {
                type: 'bubble',
                styles: {
                    body: { backgroundColor: '#ffffff' },
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: display,
                            size: 'sm',
                            wrap: true,
                            color: '#333333',
                            // ใช้ flex แบบเรียบง่ายเพื่อให้แน่ใจว่า schema ถูกต้อง
                        },
                    ],
                    paddingAll: 'lg',
                },
            },
        },
    };
}

/** สร้าง Flex Message สำหรับ Contact */
export function createContactFlex(options?: { businessHours?: string; botName?: string }): FlexReply {
    const businessHours = options?.businessHours ?? 'จันทร์–ศุกร์ 08:00–17:00 น.';
    const botName = options?.botName ?? 'MOONi';
    return {
        flex: {
            altText: 'ติดต่อเจ้าหน้าที่',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: '💬 ขอบคุณค่ะ',
                            weight: 'bold',
                            size: 'lg',
                            color: '#1a1a2e',
                        },
                        {
                            type: 'text',
                            text: `${botName} ได้รับข้อความของคุณแล้ว`,
                            size: 'sm',
                            color: '#4a4a6a',
                        },
                    ],
                    backgroundColor: '#e8f4f8',
                    paddingAll: 'lg',
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: 'ทีมเจ้าหน้าที่จะติดต่อกลับโดยเร็วที่สุดนะคะ 🙏',
                            size: 'sm',
                            wrap: true,
                            color: '#333333',
                        },
                        {
                            type: 'separator',
                            margin: 'lg',
                        },
                        {
                            type: 'text',
                            text: 'เวลาทำการ',
                            weight: 'bold',
                            size: 'sm',
                            color: '#1a1a2e',
                            margin: 'md',
                        },
                        {
                            type: 'text',
                            text: businessHours,
                            size: 'sm',
                            color: '#555555',
                        },
                        {
                            type: 'text',
                            text: 'หากต้องการติดต่อด่วน สามารถโทรหาเราได้เลยค่ะ หรือจะพิมพ์คำถามทิ้งไว้ก็ได้ค่ะ 😊',
                            size: 'xs',
                            wrap: true,
                            color: '#666666',
                            margin: 'lg',
                        },
                    ],
                    paddingAll: 'lg',
                },
            },
        },
    };
}
