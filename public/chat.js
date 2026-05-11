console.log("🚀 Hệ thống Chat Hương Kid đã kích hoạt!");

// --- CƠ CHẾ NHẬN DIỆN KHÁCH HÀNG THÔNG MINH ---
let userId = localStorage.getItem('huong_kid_user_id');
if (!userId) {
    userId = "Khach_" + Math.floor(Math.random() * 100000);
    localStorage.setItem('huong_kid_user_id', userId);
}

window.cartCount = 0;

window.sendMsg = async function(isSilent = false) {
    const box = document.getElementById('chat-box');
    const input = document.getElementById('user-input');
    const text = input.value.trim();

    if (!text) return;

    if (!isSilent) {
        box.innerHTML += `<div class="msg user">${text}</div>`;
        box.scrollTop = box.scrollHeight;
    }
    input.value = '';

    let typingId = null;
    if (!isSilent) {
        typingId = "typing-" + Date.now();
        box.innerHTML += `<div class="msg bot typing" id="${typingId}">Hương Kid đang kiểm tra...</div>`;
        box.scrollTop = box.scrollHeight;
    }

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, message: text })
        });
        const data = await response.json();

        if (typingId) document.getElementById(typingId)?.remove();

        // --- HIỂN THỊ DIAGNOSTIC (DEBUG) ---
        const diagBox = document.getElementById('diagnostic-box');
        const debugArea = document.getElementById('debug-area');
        if (data.diagnostic && diagBox) {
            if (debugArea) debugArea.style.display = 'block';
            diagBox.innerText = data.diagnostic; 
        }

        if (isSilent && (data.reply || "").includes("[[SILENT_UPDATE]]")) return;
        
        let reply = data.reply || "";

// 1. Xử lý FORM THÔNG TIN (Bản chuẩn hóa dữ liệu)

if (reply.includes("[[SHOW_ORDER_FORM")) {
    const parts = reply.match(/\[\[SHOW_ORDER_FORM\|(.*)\|(.*)\|(.*)\|(.*)\|(.*)\]\]/) || [];
    
    // Gán giá trị hoặc để trống nếu chưa có
    const valW   = (parts[1] || "").trim();    // Weight
    const valP   = (parts[2] || "").trim();    // Phone
    const valA   = (parts[3] || "").trim();    // Address
    const valN   = (parts[4] || "").trim();    // Name
    const valAge = (parts[5] || "").trim();    // Age

    // Xác định tiêu đề dựa trên việc có dữ liệu hay chưa
    const isNewCustomer = (!valN && !valP);
    const formTitle = isNewCustomer ? "🎁 ĐĂNG KÝ THÀNH VIÊN MỚI" : "🔄 CẬP NHẬT THÔNG TIN";

    const formHtml = `
        <div class="msg-form" style="background:#fff; border:2px solid #ff4757; border-radius:12px; padding:15px; margin:10px 0; font-family: sans-serif; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
            <p style="margin:0 0 12px 0; font-weight:bold; color:#ff4757; text-align:center; font-size: 16px;">${formTitle}</p>
            
            <label style="font-size:11px; color:#888; font-weight: bold;">Họ tên của Mẹ:</label>
            <input type="text" id="f-name" value="${valN}" placeholder="Tên để shop xưng hô ạ..." style="width:100%; box-sizing:border-box; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;">

            <label style="font-size:11px; color:#888; font-weight: bold;">Số điện thoại:</label>
            <input type="tel" id="f-phone" value="${valP}" placeholder="Số điện thoại nhận hàng..." style="width:100%; box-sizing:border-box; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:8px;">

            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                <div style="flex: 1;">
                    <label style="font-size:11px; color:#888; font-weight: bold;">Tuổi bé:</label>
                    <input type="text" id="f-age" value="${valAge}" placeholder="VD: 2 tuổi" style="width:100%; box-sizing:border-box; padding:10px; border:1px solid #ddd; border-radius:8px;">
                </div>
                <div style="flex: 1;">
                    <label style="font-size:11px; color:#888; font-weight: bold;">Cân nặng (kg):</label>
                    <input type="text" id="f-weight" value="${valW}" placeholder="VD: 12" style="width:100%; box-sizing:border-box; padding:10px; border:1px solid #ddd; border-radius:8px;">
                </div>
            </div>
            
            <label style="font-size:11px; color:#888; font-weight: bold;">Địa chỉ nhận hàng:</label>
            <textarea id="f-address" placeholder="Số nhà, tên đường, phường/xã..." style="width:100%; box-sizing:border-box; padding:10px; margin-bottom:15px; border:1px solid #ddd; border-radius:8px; height: 60px; resize: none;">${valA}</textarea>
            
            <button type="button" onclick="window.submitOrderForm()" style="width:100%; padding:14px; background:#ff4757; color:white; border:none; border-radius:10px; font-weight:bold; cursor:pointer; font-size: 15px;">XÁC NHẬN GỬI</button>
        </div>`;
    
    reply = reply.replace(/\[\[SHOW_ORDER_FORM.*?\]\]/g, formHtml);
}




        // --- 2. XỬ LÝ Ô NHẬP LIỆU ĐƠN (CHỈ 1 THÔNG TIN) ---
        // Cấu trúc từ Server: [[SINGLE_INPUT|Tên_nhãn|Giá_trị_cũ]]
        if (reply.includes("[[SINGLE_INPUT]]")) {
            const parts = reply.match(/\[\[SINGLE_INPUT\|(.*?)\|(.*?)\]\]/) || [];
            const label = parts[1] || "Thông tin";
            const oldVal = parts[2] || "";

            const singleHtml = `
                <div class="msg-form" style="background:#fff; border:2px solid #2ecc71; border-radius:12px; padding:12px; margin:10px 0;">
                    <p style="margin:0 0 10px 0; font-weight:bold; color:#2ecc71;">📍 Bổ sung ${label}:</p>
                    <input type="text" id="f-single" value="${oldVal}" placeholder="Nhập ${label} tại đây..." style="width:100%; padding:10px; margin-bottom:10px; border:1px solid #ddd; border-radius:6px;">
                    <button type="button" onclick="window.submitSingleInput('${label}')" style="width:100%; padding:12px; background:#2ecc71; color:white; border:none; border-radius:8px; font-weight:bold; cursor:pointer;">XÁC NHẬN</button>
                </div>`;
            reply = reply.replace(/\[\[SINGLE_INPUT.*?\]\]/g, singleHtml);
        }

        // --- 3. XỬ LÝ NÚT HỦY ĐƠN & XÓA MÃ ---
        if (reply.includes("ACTION_HUY_DON")) {
            const cancelBtn = `<button type="button" class="btn-select" style="background:#f1f2f6; color:#57606f; width:100%;" onclick="window.autoPick('Hủy đơn')">❌ Hủy đơn & Quay lại</button>`;
            reply = reply.split("ACTION_HUY_DON").join(cancelBtn);
        }
        reply = reply.replace(/ID_REMOVE_([A-Z0-9]+)/gi, (match, code) => {
            return `<button type="button" onclick="window.removeItem('${code}')" style="background:#ff4757; color:white; border:none; padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer; margin-left:8px; font-weight:bold;">Xóa</button>`;
        });

        // --- 4. XỬ LÝ NÚT BẤM [NHÃN|LỆNH] ---
        reply = reply.replace(/\[([^\]]+)\]/gi, (match, content) => {
            if (["TRACE", "ENTITIES", "SCORING"].some(kw => content.includes(kw))) return match;
            let label = content, command = content;
            if (content.includes('|')) {
                const parts = content.split('|');
                label = parts[0].trim();
                command = parts[1].trim();
            }
            if (label.includes("GIỎ HÀNG")) {
                return `<button class="btn-select btn-green" style="width:100%;" onclick="window.autoPick('Giỏ hàng')">🛒 GIỎ HÀNG (${window.cartCount})</button>`;
            }
            const isRed = ["CHỐT ĐƠN", "XEM TIẾP", "CHỌN", "XÁC NHẬN"].some(kw => label.toUpperCase().includes(kw));
            return `<button class="${isRed ? 'btn-select btn-red' : 'btn-category'}" style="${isRed ? 'margin: 5px 0; min-width: 120px;' : ''}" onclick="window.autoPick('${command}')">${label}</button>`;
        });

        let formattedReply = reply.replace(/\n/g, '<br>');
        box.innerHTML += `<div class="msg bot">${formattedReply}</div>`;
        scrollToBottom(box);

    } catch (e) {
        console.error("Lỗi kết nối:", e);
        if (typingId) document.getElementById(typingId)?.remove();
    }
};

// --- HÀM XỬ LÝ GỬI DỮ LIỆU TỪ FORM (Bản cập nhật 5 trường) ---
window.submitOrderForm = function(event) {
    const e = event || window.event;
    if (e) e.preventDefault(); 

    // Tìm form gần nhất
    const btn = e ? e.target : null;
    const parent = btn ? btn.closest('.msg-form') : document.querySelector('.msg-form');
    
    if (!parent) return console.error("Không tìm thấy khung Form!");

    // Lấy đủ 5 trường thông tin
    const n = parent.querySelector('#f-name').value.trim();
    const p = parent.querySelector('#f-phone').value.trim();
    const a = parent.querySelector('#f-address').value.trim();
    const age = parent.querySelector('#f-age').value.trim();
    const w = parent.querySelector('#f-weight').value.trim();

    // Kiểm tra bắt buộc nhập Tên và SĐT (hoặc tùy bạn chỉnh)
    if(!n || !p || !a) {
        return alert("Mẹ điền đủ Tên, SĐT và Địa chỉ để Hương Kid ship hàng nhen! ❤️");
    }

    // Chuẩn bị nội dung gửi đi (Dưới dạng một chuỗi mà Server có thể Regex được)
    // Lưu ý: Bạn có thể gửi dưới dạng text kèm tag ACTION_SUBMIT_FORM
    const inputField = document.getElementById('user-input');
    inputField.value = `Tên: ${n}, SĐT: ${p}, Bé ${age}, Nặng ${w}kg, Địa chỉ: ${a} ACTION_SUBMIT_FORM`;

    // Gọi hàm gửi tin
    if (typeof window.sendMsg === 'function') {
        window.sendMsg(false);
        
        // Hiệu ứng phản hồi cho khách
        parent.style.opacity = '0.5';
        parent.style.pointerEvents = 'none';
        parent.innerHTML = '<p style="text-align:center; color:#ff4757; padding:20px; font-weight:bold;">🚀 Đang gửi dữ liệu về hệ thống...</p>';
    } else {
        alert("Lỗi kết nối hệ thống gửi tin!");
    }
};


window.submitSingleInput = function(label) {
    const val = event.target.closest('.msg-form').querySelector('#f-single').value;
    if(!val) return alert(`Mẹ nhập ${label} giúp em nhé!`);
    document.getElementById('user-input').value = `${label}: ${val}`;
    window.sendMsg(false);
};

// --- CÁC HÀM HỖ TRỢ KHÁC ---
function scrollToBottom(box) {
    if (!box) box = document.getElementById('chat-box');
    box.scrollTop = box.scrollHeight;
}

window.autoPick = function(val) {
    const input = document.getElementById('user-input');
    if (['Giỏ hàng', 'Chốt đơn', 'Hủy đơn'].includes(val) || !/\d/.test(val)) {
        input.value = val;
        window.sendMsg(false);
    } else { 
        window.cartCount++; 
        document.querySelectorAll('.btn-green').forEach(btn => btn.innerText = `🛒 GIỎ HÀNG (${window.cartCount})`);
        showMiniToast(`Đã thêm mẫu ${val}`);
        input.value = `Chọn ${val}`; 
        window.sendMsg(true); 
    }
};

window.removeItem = function(code) {
    document.getElementById('user-input').value = `xóa mã ${code}`;
    window.sendMsg(false);
};

function showMiniToast(msg) {
    const toast = document.createElement('div');
    toast.innerText = msg;
    toast.style = "position:fixed; top:20%; left:50%; transform:translateX(-50%); background:rgba(46, 204, 113, 0.9); color:white; padding:10px 20px; border-radius:20px; z-index:9999; font-weight:bold; transition: 0.5s;";
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = "0"; setTimeout(() => toast.remove(), 500); }, 1500);
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('user-input');
    if (input) {
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); window.sendMsg(false); } });
    }
});
