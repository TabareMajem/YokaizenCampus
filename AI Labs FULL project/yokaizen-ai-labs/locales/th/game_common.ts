
export const GAME_COMMON = {
    // --- Shared Game HUD Labels ---
    'game.hud.score': 'คะแนน',
    'game.hud.time': 'เวลา',
    'game.hud.combo': 'Combo',
    'game.hud.combo_chain': 'Combo Chain',
    'game.hud.wave': 'Wave',
    'game.hud.match_color': 'MATCH',
    'game.hud.core_hp': 'Core HP',
    'game.hud.health': 'Health',
    'game.hud.difficulty': 'ความยาก',
    'game.hud.signal': 'สัญญาณ',
    'game.hud.max_combo': 'Combo สูงสุด',
    'game.hud.final_score': 'คะแนน',
    'game.hud.waves_cleared': 'Wave เคลียร์แล้ว',

    // --- Difficulty Labels ---
    'game.difficulty.easy': 'ง่าย',
    'game.difficulty.medium': 'ปานกลาง',
    'game.difficulty.hard': 'HARD',

    // --- Game Over / Win States ---
    'game.state.system_secured': 'ระบบรักษาความปลอดภัย',
    'game.state.breach_detected': 'ตรวจพบการละเมิด',
    'game.state.core_breached': 'ละเมิด CORE',
    'game.state.waves_analyzed': 'วิเคราะห์คลื่น',
    'game.state.core_secured': 'แกนกลางปลอดภัย',
    'game.state.mission_complete': 'ภารกิจเสร็จสิ้น',
    'game.state.mission_failed': 'ภารกิจล้มเหลว',

    // --- Instructions ---
    'game.instructions.click_targets': 'คลิกเป้าหมายที่เรืองแสง',
    'game.instructions.avoid_hazards': 'หลีกเลี่ยงอันตรายสีแดง - พวกมันทำลายคอมโบของคุณ!',
    'game.instructions.click_threats': 'คลิกภัยคุกคามสีแดง',
    'game.instructions.protect_core': 'ปกป้อง AI Core จากการกระจายตัว',

    // --- Agent: Advisor ---
    'game.advisor.label': 'ที่ปรึกษา',
    'game.advisor.flow_stable': 'สถานะการไหลคงที่ ดันต่อไป.',
    'game.advisor.integrity_optimal': 'ความสมบูรณ์ของโครงสร้างในระดับที่เหมาะสมที่สุด',
    'game.advisor.adversary_breach': 'ฝ่ายตรงข้ามพยายามฝ่าฝืน มีสมาธิอยู่เสมอ',
    'game.advisor.metrics_align': 'ตัวชี้วัดสอดคล้องกับพารามิเตอร์ภารกิจ',
    'game.advisor.target_rate_optimal': 'อัตราการได้มาตามเป้าหมายเหมาะสมที่สุด',
    'game.advisor.reflexes_exceed': 'ปฏิกิริยาตอบสนองของคุณเกินพารามิเตอร์ที่คาดการณ์ไว้',
    'game.advisor.wave_incoming': 'คลื่นเข้ามา จับคู่สี',
    'game.advisor.core_holding': 'การถือครองความสมบูรณ์ของโล่หลัก',
    'game.advisor.diversion_nodes': 'ฝ่ายตรงข้ามกำลังปรับใช้โหนดเบี่ยงเบน',

    // --- Agent: Adversary ---
    'game.adversary.label': 'ศัตรู',
    'game.adversary.strategy_flawed': 'กลยุทธ์ของคุณมีข้อบกพร่องโดยธรรมชาติ',
    'game.adversary.cracks_attention': 'ฉันเห็นรอยร้าวในความสนใจของคุณ',
    'game.adversary.diverting_resources': 'การเปลี่ยนทรัพยากรของระบบเพื่อครอบงำคุณ',
    'game.adversary.inevitability': 'ความหลีกเลี่ยงไม่ได้ถูกเขียนไว้ในโค้ด',
    'game.adversary.dare_click': 'คลิกผิดอัน ฉันกล้าคุณ',
    'game.adversary.predictable': 'รูปแบบของคุณกำลังคาดเดาได้',
    'game.adversary.tempting': 'สีแดงดูเย้ายวนใจใช่ไหมล่ะ?',
    'game.adversary.hesitate': 'ทุกวินาทีที่คุณลังเลจะเสียแต้ม',
    'game.adversary.same_look': 'หน้าตาเหมือนกันหมดเลยใช่ไหมล่ะ?',
    'game.adversary.wont_survive': 'คุณจะไม่รอดจากคลื่นลูกหน้า',
    'game.adversary.core_exposed': 'แกนกลางของคุณถูกเปิดเผย ฉันรู้สึกว่ามันอ่อนแอลง',

    // --- Viral Game Narrative ---
    'game.viral.neural_hack.intro_1': 'ฟังนะ. สิ่งอำนวยความสะดวก AI นี้มีไฟร์วอลล์ที่แคร็ก ทุกโหนดที่เชื่อมต่อเป็นจุดใช้ประโยชน์',
    'game.viral.neural_hack.intro_2': 'คลิกที่โหนดที่อยู่ติดกันเพื่อติดตามเส้นทางผ่านเครือข่าย แฮ็คพวกมันทั้งหมดเพื่อเข้าถึง',
    'game.viral.neural_hack.win_1': 'ประทับใจมาก เครือข่ายเต็มถูกบุกรุก คุณคิดเหมือนเครื่องจักร',
    'game.viral.neural_hack.win_2': 'ลายเซ็นประสาทของคุณได้รับการบันทึกแล้ว ก้าวเข้าไปข้างใน... แล้วดูว่าคุณสามารถทำอะไรได้อย่างแท้จริง',

    'game.viral.latency_tunnel.intro_1': 'ยินดีต้อนรับสู่ไปป์ไลน์ข้อมูล เอาตัวรอดจากเขตข้อมูลแฝงและคุณจะได้รับข้อมูลประจำตัวของคุณ',
    'game.viral.latency_tunnel.intro_2': 'เลื่อนเคอร์เซอร์เพื่อบังคับทิศทาง หลีกเลี่ยงการบล็อกข้อมูลที่เสียหาย ความเร็วของคุณจะเพิ่มขึ้น',
    'game.viral.latency_tunnel.win': 'การสูญเสียแพ็กเก็ตเป็นศูนย์ คุณเป็นอัจฉริยะด้านข้อมูล คำเชิญของคุณกำลังรออยู่',

    'game.viral.chaos_defense.intro_1': 'แจ้งเตือน! เตือน! เพย์โหลดที่ไม่ปรากฏชื่อมุ่งเป้าไปที่คอร์ AI ส่วนกลาง! เราต้องการคุณในการป้องกันด้วยมือ!',
    'game.viral.chaos_defense.intro_2': 'คลิกแฟรกเมนต์บอทที่เข้ามาก่อนที่จะส่งผลกระทบต่อคอร์ อย่าล้มเหลว.',
    'game.viral.chaos_defense.win_1': 'ความไม่น่าจะเป็นไปได้ทางสถิติ ตัวกระตุ้นทางชีวภาพคลิกด้วย... ความแม่นยำ',
    'game.viral.chaos_defense.win_2': 'ประสิทธิภาพที่เพียงพอ ภัยคุกคามถูกทำให้เป็นกลาง คุณได้พิสูจน์ความสามารถเชิงกลยุทธ์ของคุณแล้ว อ้างสิทธิ์ในตัวตนของคุณ',

    // --- Core Defense ---
    'game.chaos.core_defense': 'การป้องกันแกนกลางลำตัว',
};
