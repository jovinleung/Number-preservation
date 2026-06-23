// 包含完整前端页面的 HTML 模板字符串
// 注意：前端代码中的 `${}` 和反引号已被安全转义，以确保 Worker 能正确解析
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eSIM 资产与加密账号看板</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
            min-height: 100vh;
        }
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .glass-panel {
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .glass-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .modal-enter { opacity: 0; transform: scale(0.9); }
        .modal-enter-active { opacity: 1; transform: scale(1); transition: all 0.3s ease; }
        
        /* 自定义 Toast 提示样式 */
        #toast-container {
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .toast {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(8px);
            color: #333;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            border-left: 4px solid #3b82f6;
            font-weight: 600;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        }
        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }
    </style>
</head>
<body class="text-gray-800 font-sans p-4 md:p-8 relative">

    <div id="toast-container"></div>

    <div id="login-container" class="max-w-md mx-auto glass-panel rounded-3xl p-8 md:p-10 mt-16 md:mt-32 text-center transition-all">
        <div class="w-20 h-20 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <i class="fa-solid fa-shield-halved text-4xl text-blue-600"></i>
        </div>
        <h2 class="text-3xl font-extrabold text-gray-900 mb-2">安全验证</h2>
        <p class="text-gray-600 mb-8 text-sm font-medium">为保护您的卡片与加密账号资产，请获取验证码登录。</p>
        
        <div class="mb-6 relative">
            <input type="text" id="authCode" placeholder="输入 6 位数验证码" maxlength="6" class="w-full px-4 py-4 rounded-xl border border-gray-300/50 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 shadow-inner placeholder-gray-400 placeholder:tracking-normal placeholder:text-base">
        </div>
        
        <div class="flex flex-col gap-4 mt-8">
            <button id="loginBtn" onclick="verifyCode()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                <i class="fa-solid fa-arrow-right-to-bracket"></i> 登录面板
            </button>
            <button id="sendCodeBtn" onclick="sendAuthCode()" class="w-full bg-white/60 hover:bg-white/80 text-blue-700 font-bold py-3.5 px-4 rounded-xl border border-blue-200/50 transition-colors flex items-center justify-center gap-2">
                <i class="fa-brands fa-telegram text-xl"></i> 向 TG 机器人获取验证码
            </button>
        </div>
    </div>

    <div id="main-container" class="max-w-6xl mx-auto glass-panel rounded-3xl p-6 md:p-10 mt-4 md:mt-8 hidden">
        <div class="flex flex-col md:flex-row justify-between items-center mb-6 border-b border-white/50 pb-4 gap-4">
            <div class="flex gap-4 md:gap-8 items-center justify-center w-full md:w-auto overflow-x-auto">
                <button onclick="switchTab('esim')" id="tab-esim" class="text-xl md:text-2xl font-extrabold text-blue-700 border-b-4 border-blue-600 pb-2 transition-colors flex items-center gap-2 whitespace-nowrap">
                    <i class="fa-solid fa-sim-card"></i> eSIM 资产
                </button>
                <button onclick="switchTab('account')" id="tab-account" class="text-xl md:text-2xl font-extrabold text-gray-500 border-b-4 border-transparent hover:text-blue-500 pb-2 transition-colors flex items-center gap-2 whitespace-nowrap opacity-70">
                    <i class="fa-solid fa-vault"></i> 账号库 <i class="fa-solid fa-lock text-sm opacity-50" id="tab-lock-icon"></i>
                </button>
            </div>
            
            <div class="flex gap-3 items-center flex-wrap justify-center">
                <span class="text-sm bg-white/50 px-4 py-2 rounded-full font-semibold shadow-sm hidden md:inline-block">
                    今日：<span id="current-date" class="text-blue-700">...</span>
                </span>
                
                <!-- eSIM 面板按钮 -->
                <button id="btn-add-esim" onclick="openModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2">
                    <i class="fa-solid fa-plus"></i> 添加号码
                </button>
                
                <!-- 账号库 面板按钮 (默认隐藏) -->
                <button id="btn-add-account" onclick="openAccountModal()" class="hidden bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2">
                    <i class="fa-solid fa-plus"></i> 添加账号
                </button>
                <button id="btn-lock-vault" onclick="lockVault()" class="hidden bg-gray-600 hover:bg-gray-700 text-white px-4 py-2.5 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2" title="立即锁定保险库">
                    <i class="fa-solid fa-lock"></i>
                </button>

                <button onclick="logout()" class="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-full font-bold shadow-sm transition-colors flex items-center gap-2 border border-red-200" title="退出登录">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        </div>

        <!-- ================= eSIM 视图 ================= -->
        <div id="view-esim" class="block">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10" id="stats-container">
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="esim-container">
                <div class="col-span-full text-center py-10 text-gray-700 font-medium text-lg" id="loading-text">
                    <i class="fa-solid fa-spinner fa-spin mr-2"></i> 正在读取数据...
                </div>
            </div>
        </div>

        <!-- ================= 账号库 视图 ================= -->
        <div id="view-account" class="hidden">
            <!-- 锁定界面 -->
            <div id="vault-locked" class="max-w-md mx-auto glass-card rounded-3xl p-8 text-center mt-10 shadow-xl border-t-4 border-t-indigo-500">
                <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <i class="fa-solid fa-shield-halved text-3xl text-indigo-600"></i>
                </div>
                <h3 class="text-2xl font-bold text-gray-900 mb-3">端到端加密保险库</h3>
                <p class="text-gray-600 text-sm mb-6 leading-relaxed">您的密码将被 <strong>AES-GCM 算法</strong> 在本地高强度加密。云端仅存储不可读的密文，实现零知识安全。</p>
                <div class="mb-4 relative">
                    <input type="password" id="vaultPassword" placeholder="输入或设置保险库主密码" class="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80 shadow-inner text-center tracking-widest font-mono placeholder:tracking-normal placeholder:font-sans">
                </div>
                <button id="unlockVaultBtn" onclick="unlockVault()" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                    <i class="fa-solid fa-key"></i> 本地派生密钥并解锁
                </button>
                <div class="mt-6 p-3 bg-red-50 rounded-lg border border-red-100">
                    <p class="text-xs text-red-600 font-medium"><i class="fa-solid fa-triangle-exclamation mr-1"></i> <strong>极度重要：</strong>若遗忘此主密码，所有记录的账号密码将永久无法解密（不可逆）！</p>
                </div>
            </div>

            <!-- 解锁后的界面 -->
            <div id="vault-unlocked" class="hidden">
                <div class="mb-6 text-sm text-green-700 flex items-center justify-between bg-green-50/80 p-3 rounded-xl border border-green-200 shadow-sm backdrop-blur-sm">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-lock-open text-green-600 text-lg"></i>
                        <span>保险库已成功解密。<span class="hidden md:inline">密码在您的设备本地解密，传输与存储均为极高安全的 AES 密文。</span></span>
                    </div>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="account-container">
                    <div class="col-span-full text-center py-10 text-gray-700 font-medium text-lg">
                        <i class="fa-solid fa-spinner fa-spin mr-2"></i> 正在读取并解密账号数据...
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- eSIM 添加/编辑弹窗 -->
    <div id="addModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative transition-all duration-300 transform scale-95 opacity-0 max-h-[95vh] overflow-y-auto" id="modalContent">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl z-10">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2" id="modalTitle">
                <i class="fa-solid fa-file-circle-plus text-blue-600"></i> 新增 eSIM
            </h3>
            
            <form id="addForm" onsubmit="submitForm(event)">
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">卡片名称 (必填)</label>
                    <input type="text" id="simName" required placeholder="例如：KnowRoaming" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">手机号码带区号 (选填)</label>
                    <input type="text" id="simNumber" placeholder="例如：+1 234 567 8900" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">保号周期 (单位：天，必填)</label>
                    <input type="number" id="simCycle" required placeholder="例如：180" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">本次到期日 (必填)</label>
                    <input type="date" id="simExpire" required class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                
                <div class="mb-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                    <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><i class="fa-solid fa-bell text-blue-500"></i> 定制 Telegram 提醒规则</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label class="block text-gray-600 text-xs font-bold mb-1" title="距离到期还有多少天时开始发送电报提醒">提前提醒(天)</label>
                            <input type="number" id="simNotifyAdvance" placeholder="默认: 15" min="0" class="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 text-sm">
                        </div>
                        <div>
                            <label class="block text-gray-600 text-xs font-bold mb-1" title="每隔几天发送一次提醒">提醒间隔(天)</label>
                            <input type="number" id="simNotifyInterval" placeholder="默认: 1" min="1" class="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 text-sm">
                        </div>
                        <div>
                            <label class="block text-gray-600 text-xs font-bold mb-1" title="总共提醒的次数上限，0或留空表示不限制">最高次数限制</label>
                            <input type="number" id="simNotifyCount" placeholder="默认: 不限" min="0" class="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80 text-sm">
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">已注册平台 (选填，用逗号或空格分隔)</label>
                    <input type="text" id="simPlatforms" placeholder="例如：Telegram, Google, ChatGPT" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2">备注 / 保号要求 (选填)</label>
                    <input type="text" id="simRemark" placeholder="例如：发送短信到某号码 或 充值5元" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                
                <button type="submit" id="submitBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors">
                    保存并监控
                </button>
            </form>
        </div>
    </div>

    <!-- 账号 添加/编辑弹窗 -->
    <div id="accountModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative transition-all duration-300 transform scale-95 opacity-0 max-h-[95vh] overflow-y-auto" id="accountModalContent">
            <button onclick="closeAccountModal()" class="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl z-10">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2" id="accountModalTitle">
                <i class="fa-solid fa-vault text-indigo-600"></i> 新增加密账号
            </h3>
            
            <form id="accountForm" onsubmit="submitAccountForm(event)">
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">所属地区/平台 (必填)</label>
                    <input type="text" id="accRegion" required placeholder="例如：英国 / Google" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">账号/用户名 (必填)</label>
                    <input type="text" id="accAccount" required placeholder="例如：user@example.com" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2 flex items-center gap-1">密码 (选填) <i class="fa-solid fa-shield-halved text-green-500 text-xs" title="此字段将端到端加密"></i></label>
                    <div class="relative">
                        <input type="password" id="accPassword" placeholder="将被 AES-GCM 加密保护" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80 font-mono">
                        <button type="button" onclick="togglePasswordVisibility('accPassword', 'accPwdIcon')" class="absolute right-3 top-2.5 text-gray-400 hover:text-indigo-600">
                            <i id="accPwdIcon" class="fa-solid fa-eye-slash"></i>
                        </button>
                    </div>
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2">备注选项 (明文，选填)</label>
                    <textarea id="accRemark" placeholder="例如：使用某个手机号注册，辅助邮箱等..." rows="3" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white/80"></textarea>
                </div>
                
                <button type="submit" id="submitAccountBtn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex justify-center items-center gap-2">
                    <i class="fa-solid fa-lock"></i> 加密并保存
                </button>
            </form>
        </div>
    </div>

    <!-- 通用确认弹窗 -->
    <div id="confirmModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="glass-card w-full max-w-sm rounded-2xl p-6 shadow-2xl relative transition-all duration-300 transform scale-95 opacity-0 text-center" id="confirmModalContent">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm" id="confirmIconBg">
                <i class="fa-solid fa-triangle-exclamation text-3xl" id="confirmIcon"></i>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2" id="confirmTitle">确认操作</h3>
            <p class="text-gray-600 mb-6 text-sm whitespace-pre-line" id="confirmMessage">确定要执行此操作吗？</p>
            
            <div class="flex gap-4 w-full">
                <button onclick="closeConfirmModal()" class="flex-1 bg-white/60 hover:bg-white/80 text-gray-700 font-bold py-3 px-4 rounded-xl border border-gray-200/50 shadow-sm transition-colors">
                    取消
                </button>
                <button id="confirmActionBtn" class="flex-1 font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
                    确定
                </button>
            </div>
        </div>
    </div>

    <script>
        // API 路由前缀
        const WORKER_API_URL = "/api/esims";
        const WORKER_API_ACCOUNT_URL = "/api/accounts";
        
        let esimData = []; 
        let accountData = [];
        let countdownInterval;
        let editingId = null; 
        let editingAccountId = null;
        let currentTab = 'esim';

        // ================= 端到端加密 (E2EE) 核心逻辑 =================
        let vaultMasterKey = null; // 内存中保存的 AES-GCM 密钥，刷新即焚
        const VAULT_SALT = new TextEncoder().encode("ESIM_VAULT_SECURE_SALT"); // 固定 Salt

        // ArrayBuffer 转 Base64
        function bufferToBase64(buf) {
            let binary = '';
            let bytes = new Uint8Array(buf);
            let len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
        }

        // Base64 转 ArrayBuffer
        function base64ToBuffer(base64) {
            let binary_string = window.atob(base64);
            let len = binary_string.length;
            let bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binary_string.charCodeAt(i);
            }
            return bytes.buffer;
        }

        // 派生加密密钥
        async function deriveCryptoKey(password) {
            const enc = new TextEncoder();
            const keyMaterial = await window.crypto.subtle.importKey(
                "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]
            );
            return window.crypto.subtle.deriveKey(
                { name: "PBKDF2", salt: VAULT_SALT, iterations: 100000, hash: "SHA-256" },
                keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
            );
        }

        // 加密字符串
        async function encryptString(plainText, key) {
            if (!plainText) return "";
            try {
                const enc = new TextEncoder();
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const cipherBuffer = await window.crypto.subtle.encrypt(
                    { name: "AES-GCM", iv: iv }, key, enc.encode(plainText)
                );
                const ivBase64 = bufferToBase64(iv);
                const cipherBase64 = bufferToBase64(cipherBuffer);
                return \`AES-GCM:\${ivBase64}:\${cipherBase64}\`;
            } catch (e) {
                console.error("加密失败", e);
                throw new Error("加密失败");
            }
        }

        // 解密字符串
        async function decryptString(encryptedText, key) {
            if (!encryptedText) return "";
            if (!encryptedText.startsWith("AES-GCM:")) return encryptedText; // 兼容未加密的旧数据
            try {
                const parts = encryptedText.split(":");
                const iv = new Uint8Array(base64ToBuffer(parts[1]));
                const cipher = base64ToBuffer(parts[2]);
                const plainBuffer = await window.crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: iv }, key, cipher
                );
                return new TextDecoder().decode(plainBuffer);
            } catch (e) {
                console.error("解密失败", e);
                return "🔒解密失败(主密码错误)";
            }
        }

        // ================= 工具函数 =================
        function escapeHtml(unsafe) {
            return (unsafe || "").toString()
                 .replace(/&/g, "&amp;")
                 .replace(/</g, "&lt;")
                 .replace(/>/g, "&gt;")
                 .replace(/"/g, "&quot;")
                 .replace(/'/g, "&#039;");
        }

        function showToast(message) {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = 'toast';
            toast.innerHTML = \`<i class="fa-solid fa-circle-check text-blue-500 mr-2"></i>\${message}\`;
            container.appendChild(toast);
            
            setTimeout(() => toast.classList.add('show'), 10);
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // 标签页切换逻辑
        function switchTab(tab) {
            currentTab = tab;
            const tabEsim = document.getElementById('tab-esim');
            const tabAccount = document.getElementById('tab-account');
            const viewEsim = document.getElementById('view-esim');
            const viewAccount = document.getElementById('view-account');
            const btnAddEsim = document.getElementById('btn-add-esim');
            const btnAddAccount = document.getElementById('btn-add-account');
            const btnLockVault = document.getElementById('btn-lock-vault');

            if(tab === 'esim') {
                tabEsim.className = "text-xl md:text-2xl font-extrabold text-blue-700 border-b-4 border-blue-600 pb-2 transition-colors flex items-center gap-2 whitespace-nowrap";
                tabAccount.className = "text-xl md:text-2xl font-extrabold text-gray-500 border-b-4 border-transparent hover:text-blue-500 pb-2 transition-colors flex items-center gap-2 whitespace-nowrap opacity-70";
                viewEsim.classList.remove('hidden');
                viewEsim.classList.add('block');
                viewAccount.classList.remove('block');
                viewAccount.classList.add('hidden');
                
                btnAddEsim.classList.remove('hidden');
                btnAddAccount.classList.add('hidden');
                btnLockVault.classList.add('hidden');
            } else {
                tabAccount.className = "text-xl md:text-2xl font-extrabold text-indigo-700 border-b-4 border-indigo-600 pb-2 transition-colors flex items-center gap-2 whitespace-nowrap";
                tabEsim.className = "text-xl md:text-2xl font-extrabold text-gray-500 border-b-4 border-transparent hover:text-indigo-500 pb-2 transition-colors flex items-center gap-2 whitespace-nowrap opacity-70";
                viewAccount.classList.remove('hidden');
                viewAccount.classList.add('block');
                viewEsim.classList.remove('block');
                viewEsim.classList.add('hidden');
                
                btnAddEsim.classList.add('hidden');
                
                // 判断保险库是否已解锁
                if (vaultMasterKey) {
                    btnAddAccount.classList.remove('hidden');
                    btnLockVault.classList.remove('hidden');
                } else {
                    btnAddAccount.classList.add('hidden');
                    btnLockVault.classList.add('hidden');
                }
            }
        }

        // ================= 全球极其全面的 SVG 国旗字典配置 =================
        const countryFlags = [
            // 北美及加勒比海 (NANP +1) - 长区号优先匹配
            { prefix: "+1242", iso: ["bs"] }, { prefix: "+1246", iso: ["bb"] }, { prefix: "+1264", iso: ["ai"] }, { prefix: "+1268", iso: ["ag"] },
            { prefix: "+1284", iso: ["vg"] }, { prefix: "+1340", iso: ["vi"] }, { prefix: "+1345", iso: ["ky"] }, { prefix: "+1441", iso: ["bm"] },
            { prefix: "+1473", iso: ["gd"] }, { prefix: "+1649", iso: ["tc"] }, { prefix: "+1664", iso: ["ms"] }, { prefix: "+1670", iso: ["mp"] },
            { prefix: "+1671", iso: ["gu"] }, { prefix: "+1684", iso: ["as"] }, { prefix: "+1721", iso: ["sx"] }, { prefix: "+1758", iso: ["lc"] },
            { prefix: "+1767", iso: ["dm"] }, { prefix: "+1784", iso: ["vc"] }, { prefix: "+1787", iso: ["pr"] }, { prefix: "+1939", iso: ["pr"] },
            { prefix: "+1809", iso: ["do"] }, { prefix: "+1829", iso: ["do"] }, { prefix: "+1849", iso: ["do"] }, { prefix: "+1868", iso: ["tt"] },
            { prefix: "+1876", iso: ["jm"] }, { prefix: "+1", iso: ["us", "ca"] }, 
            
            // 亚洲
            { prefix: "+86", iso: ["cn"] }, { prefix: "+852", iso: ["hk"] }, { prefix: "+853", iso: ["mo"] }, { prefix: "+886", iso: ["tw"] },
            { prefix: "+81", iso: ["jp"] }, { prefix: "+82", iso: ["kr"] }, { prefix: "+850", iso: ["kp"] }, { prefix: "+65", iso: ["sg"] },
            { prefix: "+60", iso: ["my"] }, { prefix: "+62", iso: ["id"] }, { prefix: "+63", iso: ["ph"] }, { prefix: "+66", iso: ["th"] },
            { prefix: "+84", iso: ["vn"] }, { prefix: "+91", iso: ["in"] }, { prefix: "+92", iso: ["pk"] }, { prefix: "+93", iso: ["af"] },
            { prefix: "+94", iso: ["lk"] }, { prefix: "+95", iso: ["mm"] }, { prefix: "+98", iso: ["ir"] }, { prefix: "+971", iso: ["ae"] },
            { prefix: "+972", iso: ["il"] }, { prefix: "+973", iso: ["bh"] }, { prefix: "+974", iso: ["qa"] }, { prefix: "+975", iso: ["bt"] },
            { prefix: "+976", iso: ["mn"] }, { prefix: "+977", iso: ["np"] }, { prefix: "+960", iso: ["mv"] }, { prefix: "+961", iso: ["lb"] },
            { prefix: "+962", iso: ["jo"] }, { prefix: "+963", iso: ["sy"] }, { prefix: "+964", iso: ["iq"] }, { prefix: "+965", iso: ["kw"] },
            { prefix: "+966", iso: ["sa"] }, { prefix: "+968", iso: ["om"] }, { prefix: "+992", iso: ["tj"] }, { prefix: "+993", iso: ["tm"] },
            { prefix: "+994", iso: ["az"] }, { prefix: "+995", iso: ["ge"] }, { prefix: "+996", iso: ["kg"] }, { prefix: "+998", iso: ["uz"] },
            { prefix: "+855", iso: ["kh"] }, { prefix: "+856", iso: ["la"] }, { prefix: "+880", iso: ["bd"] }, { prefix: "+90", iso: ["tr"] },

            // 欧洲
            { prefix: "+44", iso: ["gb"] }, { prefix: "+33", iso: ["fr"] }, { prefix: "+49", iso: ["de"] }, { prefix: "+39", iso: ["it"] },
            { prefix: "+34", iso: ["es"] }, { prefix: "+7", iso: ["ru", "kz"] }, { prefix: "+380", iso: ["ua"] }, { prefix: "+31", iso: ["nl"] },
            { prefix: "+32", iso: ["be"] }, { prefix: "+41", iso: ["ch"] }, { prefix: "+43", iso: ["at"] }, { prefix: "+46", iso: ["se"] },
            { prefix: "+47", iso: ["no"] }, { prefix: "+48", iso: ["pl"] }, { prefix: "+45", iso: ["dk"] }, { prefix: "+358", iso: ["fi"] },
            { prefix: "+351", iso: ["pt"] }, { prefix: "+30", iso: ["gr"] }, { prefix: "+353", iso: ["ie"] }, { prefix: "+370", iso: ["lt"] },
            { prefix: "+371", iso: ["lv"] }, { prefix: "+372", iso: ["ee"] }, { prefix: "+374", iso: ["am"] }, { prefix: "+381", iso: ["rs"] },
            { prefix: "+359", iso: ["bg"] }, { prefix: "+357", iso: ["cy"] }, { prefix: "+420", iso: ["cz"] }, { prefix: "+421", iso: ["sk"] },
            { prefix: "+36", iso: ["hu"] }, { prefix: "+40", iso: ["ro"] }, { prefix: "+385", iso: ["hr"] }, { prefix: "+386", iso: ["si"] },
            { prefix: "+387", iso: ["ba"] }, { prefix: "+389", iso: ["mk"] }, { prefix: "+355", iso: ["al"] }, { prefix: "+352", iso: ["lu"] },
            { prefix: "+356", iso: ["mt"] }, { prefix: "+354", iso: ["is"] }, { prefix: "+376", iso: ["ad"] }, { prefix: "+373", iso: ["md"] },
            { prefix: "+377", iso: ["mc"] }, { prefix: "+378", iso: ["sm"] }, { prefix: "+382", iso: ["me"] }, { prefix: "+423", iso: ["li"] },
            { prefix: "+350", iso: ["gi"] }, { prefix: "+298", iso: ["fo"] },

            // 中美洲及南美洲
            { prefix: "+55", iso: ["br"] }, { prefix: "+54", iso: ["ar"] }, { prefix: "+56", iso: ["cl"] }, { prefix: "+57", iso: ["co"] },
            { prefix: "+51", iso: ["pe"] }, { prefix: "+58", iso: ["ve"] }, { prefix: "+591", iso: ["bo"] }, { prefix: "+593", iso: ["ec"] },
            { prefix: "+595", iso: ["py"] }, { prefix: "+598", iso: ["uy"] }, { prefix: "+592", iso: ["gy"] }, { prefix: "+597", iso: ["sr"] },
            { prefix: "+52", iso: ["mx"] }, { prefix: "+501", iso: ["bz"] }, { prefix: "+502", iso: ["gt"] }, { prefix: "+503", iso: ["sv"] },
            { prefix: "+504", iso: ["hn"] }, { prefix: "+505", iso: ["ni"] }, { prefix: "+506", iso: ["cr"] }, { prefix: "+507", iso: ["pa"] },

            // 大洋洲
            { prefix: "+61", iso: ["au"] }, { prefix: "+64", iso: ["nz"] }, { prefix: "+679", iso: ["fj"] }, { prefix: "+675", iso: ["pg"] },
            { prefix: "+678", iso: ["vu"] }, { prefix: "+677", iso: ["sb"] }, { prefix: "+676", iso: ["to"] }, { prefix: "+685", iso: ["ws"] },
            { prefix: "+686", iso: ["ki"] }, { prefix: "+688", iso: ["tv"] }, { prefix: "+674", iso: ["nr"] }, { prefix: "+680", iso: ["pw"] },
            { prefix: "+692", iso: ["mh"] }, { prefix: "+691", iso: ["fm"] }, { prefix: "+687", iso: ["nc"] }, { prefix: "+689", iso: ["pf"] },

            // 非洲
            { prefix: "+27", iso: ["za"] }, { prefix: "+234", iso: ["ng"] }, { prefix: "+20", iso: ["eg"] }, { prefix: "+254", iso: ["ke"] },
            { prefix: "+212", iso: ["ma"] }, { prefix: "+213", iso: ["dz"] }, { prefix: "+216", iso: ["tn"] }, { prefix: "+218", iso: ["ly"] },
            { prefix: "+249", iso: ["sd"] }, { prefix: "+251", iso: ["et"] }, { prefix: "+255", iso: ["tz"] }, { prefix: "+256", iso: ["ug"] },
            { prefix: "+233", iso: ["gh"] }, { prefix: "+225", iso: ["ci"] }, { prefix: "+237", iso: ["cm"] }, { prefix: "+221", iso: ["sn"] },
            { prefix: "+223", iso: ["ml"] }, { prefix: "+224", iso: ["gn"] }, { prefix: "+228", iso: ["tg"] }, { prefix: "+229", iso: ["bj"] },
            { prefix: "+227", iso: ["ne"] }, { prefix: "+226", iso: ["bf"] }, { prefix: "+231", iso: ["lr"] }, { prefix: "+232", iso: ["sl"] },
            { prefix: "+220", iso: ["gm"] }, { prefix: "+245", iso: ["gw"] }, { prefix: "+238", iso: ["cv"] }, { prefix: "+239", iso: ["st"] },
            { prefix: "+240", iso: ["gq"] }, { prefix: "+241", iso: ["ga"] }, { prefix: "+242", iso: ["cg"] }, { prefix: "+243", iso: ["cd"] },
            { prefix: "+244", iso: ["ao"] }, { prefix: "+260", iso: ["zm"] }, { prefix: "+263", iso: ["zw"] }, { prefix: "+264", iso: ["na"] },
            { prefix: "+267", iso: ["bw"] }, { prefix: "+268", iso: ["sz"] }, { prefix: "+266", iso: ["ls"] }, { prefix: "+261", iso: ["mg"] },
            { prefix: "+230", iso: ["mu"] }, { prefix: "+248", iso: ["sc"] }, { prefix: "+262", iso: ["re"] }, { prefix: "+253", iso: ["dj"] },
            { prefix: "+252", iso: ["so"] }, { prefix: "+250", iso: ["rw"] }, { prefix: "+257", iso: ["bi"] }, { prefix: "+258", iso: ["mz"] },
            { prefix: "+265", iso: ["mw"] }
        ];

        function getCountryFlag(numberStr) {
            const defaultIcon = '<i class="fa-solid fa-globe text-blue-400 text-lg"></i>';
            if (!numberStr) return defaultIcon; 
            const cleanNumber = numberStr.replace(/[\\s\\-\\(\\)\\.]/g, '');
            if (!cleanNumber.startsWith("+")) return defaultIcon; 
            
            const sortedFlags = countryFlags.sort((a, b) => b.prefix.length - a.prefix.length);
            for (let item of sortedFlags) {
                if (cleanNumber.startsWith(item.prefix)) {
                    return item.iso.map(code => 
                        \`<img src="https://flagcdn.com/\${code}.svg" class="inline-block w-[22px] h-auto rounded-[2px] shadow-[0_0_2px_rgba(0,0,0,0.2)]" alt="\${code}" title="国家/地区代码：\${item.prefix}">\`
                    ).join('<span class="mx-0.5 text-gray-300 text-xs">/</span>');
                }
            }
            return defaultIcon; 
        }

        document.getElementById('current-date').innerText = new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        
        window.onload = () => {
            if (localStorage.getItem('esim_auth_token')) {
                fetchAllData();
            }
        };

        function getAuthHeaders() {
            return {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('esim_auth_token') || ''
            };
        }

        // ================= 安全验证相关功能 =================
        async function sendAuthCode() {
            const btn = document.getElementById('sendCodeBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 发送中...';
            
            try {
                const response = await fetch('/api/auth/send', { method: 'POST' });
                const data = await response.json();
                
                if (response.ok && data.success) {
                    let timeLeft = 60;
                    btn.innerHTML = \`<i class="fa-solid fa-clock mr-2"></i> \${timeLeft} 秒后可重发\`;
                    countdownInterval = setInterval(() => {
                        timeLeft--;
                        if (timeLeft <= 0) {
                            clearInterval(countdownInterval);
                            btn.disabled = false;
                            btn.innerHTML = '<i class="fa-brands fa-telegram text-xl mr-2"></i> 向 TG 机器人获取验证码';
                        } else {
                            btn.innerHTML = \`<i class="fa-solid fa-clock mr-2"></i> \${timeLeft} 秒后可重发\`;
                        }
                    }, 1000);
                } else {
                    alert("发送失败: " + (data.message || "后端未配置机器人信息"));
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-brands fa-telegram text-xl mr-2"></i> 向 TG 机器人获取验证码';
                }
            } catch (e) {
                alert("网络错误，发送失败");
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-brands fa-telegram text-xl mr-2"></i> 向 TG 机器人获取验证码';
            }
        }

        async function verifyCode() {
            const codeInput = document.getElementById('authCode').value.trim();
            if (!codeInput || codeInput.length !== 6) return alert("请输入完整的 6 位数字验证码");
            
            const btn = document.getElementById('loginBtn');
            const originalHTML = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 验证中...';
            
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: codeInput })
                });
                const data = await response.json();
                
                if (response.ok && data.success) {
                    localStorage.setItem('esim_auth_token', data.token);
                    document.getElementById('authCode').value = '';
                    fetchAllData();
                } else {
                    alert("登录失败: " + (data.message || "验证码错误或已过期"));
                    btn.disabled = false;
                    btn.innerHTML = originalHTML;
                }
            } catch (e) {
                alert("网络错误，验证失败");
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }
        }

        function logout() {
            localStorage.removeItem('esim_auth_token');
            document.getElementById('login-container').classList.remove('hidden');
            document.getElementById('main-container').classList.add('hidden');
            lockVault(); // 退出时顺便锁定
        }

        // ================= 数据加载总控 =================
        async function fetchAllData() {
            document.getElementById('login-container').classList.add('hidden');
            document.getElementById('main-container').classList.remove('hidden');
            
            await fetchEsimData();
            // 注意：账号库数据只有在输入主密码解锁后才会获取，避免在后台驻留加密字符串
        }

        // ================= eSIM 核心业务功能 =================
        async function fetchEsimData() {
            const container = document.getElementById('esim-container');
            container.innerHTML = \`<div class="col-span-full text-center py-10 text-gray-700 font-medium text-lg"><i class="fa-solid fa-spinner fa-spin mr-2"></i> 正在加载数据...</div>\`;
            
            try {
                const response = await fetch(WORKER_API_URL, { headers: getAuthHeaders() });
                if (response.status === 401) { logout(); return; }
                if (!response.ok) throw new Error("网络请求失败");
                
                esimData = await response.json();
                renderCards(esimData);
            } catch (error) {
                console.error("加载失败:", error);
                container.innerHTML = \`
                    <div class="col-span-full text-center py-10">
                        <i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-3"></i>
                        <h3 class="text-xl font-bold text-gray-800">获取数据失败</h3>
                        <p class="text-gray-600 mt-2">网络异常，请重试。</p>
                    </div>\`;
            }
        }

        function renderCards(esims) {
            const container = document.getElementById('esim-container');
            const statsContainer = document.getElementById('stats-container');
            container.innerHTML = ''; 

            let safeCount = 0;
            let warningCount = 0;
            let dangerCount = 0;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if(esims.length === 0) {
                container.innerHTML = \`<div class="col-span-full text-center py-16 text-gray-500"><i class="fa-solid fa-box-open text-4xl mb-3"></i><p>还没有添加任何号码，点击右上角添加吧！</p></div>\`;
            }

            esims.sort((a, b) => new Date(a.expireDate) - new Date(b.expireDate));

            esims.forEach(sim => {
                const expDate = new Date(sim.expireDate);
                expDate.setHours(0, 0, 0, 0);
                const diffTime = expDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // 解析动态提醒规则：对“0”进行安全保留校验，空值回退默认
                const advance = sim.notifyAdvance !== undefined && sim.notifyAdvance !== "" ? parseInt(sim.notifyAdvance) : 15;
                const interval = sim.notifyInterval !== undefined && sim.notifyInterval !== "" ? parseInt(sim.notifyInterval) : 1;
                const maxCount = sim.notifyCount !== undefined && sim.notifyCount !== "" ? parseInt(sim.notifyCount) : 0;
                
                const warningLimit = Math.max(45, advance + 15);

                let statusColor = "bg-green-500";
                let statusText = "状态安全";
                let badgeClass = "bg-green-100 text-green-800";
                let icon = "fa-check-circle text-green-500";

                if (diffDays <= 0) {
                    statusColor = "bg-gray-500";
                    statusText = diffDays === 0 ? "今日到期" : "已过期";
                    badgeClass = "bg-gray-100 text-gray-800";
                    icon = "fa-times-circle text-gray-500";
                    dangerCount++;
                } else if (diffDays <= advance) {
                    statusColor = "bg-red-500";
                    statusText = "即将过期";
                    badgeClass = "bg-red-100 text-red-800";
                    icon = "fa-triangle-exclamation text-red-500";
                    dangerCount++;
                } else if (diffDays <= warningLimit) {
                    statusColor = "bg-yellow-400";
                    statusText = "建议关注";
                    badgeClass = "bg-yellow-100 text-yellow-800";
                    icon = "fa-bell text-yellow-500";
                    warningCount++;
                } else {
                    safeCount++;
                }

                let percent = Math.min(Math.max((diffDays / 365) * 100, 0), 100);
                const flagHTML = getCountryFlag(sim.number);
                
                let customNotifyIcon = '';
                if (advance !== 15 || interval !== 1 || maxCount !== 0) {
                    const countText = maxCount > 0 ? "共" + maxCount + "次" : "次数不限";
                    const titleText = "自定义提醒: 提前" + advance + "天开始, 每" + interval + "天提醒, " + countText;
                    customNotifyIcon = '<i class="fa-solid fa-bell-sliders text-xs text-blue-400 ml-2 cursor-help" title="' + titleText + '"></i>';
                }

                const remarkHTML = sim.remark ? \`<div class="bg-blue-50/60 rounded-lg p-2.5 mb-3 text-xs text-gray-700 border border-blue-100/60 break-words leading-relaxed"><i class="fa-regular fa-comment-dots mr-1.5 text-blue-400"></i>\${escapeHtml(sim.remark)}</div>\` : '';

                let platformsHTML = '';
                if (sim.platforms && sim.platforms.trim() !== '') {
                    const pList = sim.platforms.split(/[,，\\s]+/).filter(p => p.trim() !== '');
                    if (pList.length > 0) {
                        const badges = pList.map(p => \`<span class="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm whitespace-nowrap mb-1.5 mr-1.5"><i class="fa-solid fa-hashtag mr-1 opacity-60"></i>\${escapeHtml(p)}</span>\`).join('');
                        platformsHTML = \`<div class="mb-3">
                            <div class="flex flex-wrap">\${badges}</div>
                        </div>\`;
                    }
                }

                const cardHTML = \`
                    <div class="glass-card rounded-2xl p-6 relative overflow-hidden group flex flex-col h-full">
                        
                        <div class="absolute top-4 right-4 flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 z-20 bg-white/80 p-1.5 rounded-full backdrop-blur-md border border-white/60 shadow-sm">
                            <button onclick="openEditModal('\${sim.id}')" class="text-green-600 hover:text-white hover:bg-green-500 bg-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm" title="编辑卡片资料">
                                <i class="fa-solid fa-pen text-sm"></i>
                            </button>
                            <button onclick="renewEsim('\${sim.id}', \${sim.cycle || 0})" class="text-blue-600 hover:text-white hover:bg-blue-500 bg-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm" title="一键续期（按周期顺延）">
                                <i class="fa-solid fa-rotate-right text-sm"></i>
                            </button>
                            <button onclick="deleteEsim('\${sim.id}')" class="text-red-500 hover:text-white hover:bg-red-500 bg-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm" title="删除号码">
                                <i class="fa-solid fa-trash-can text-sm"></i>
                            </button>
                        </div>

                        <div class="pr-28 mb-3 flex items-center">
                            <h2 class="text-xl font-bold text-gray-900 truncate" title="\${escapeHtml(sim.name)}">\${escapeHtml(sim.name)}</h2>
                            \${customNotifyIcon}
                        </div>
                        
                        <div class="flex justify-between items-center mb-4 gap-2">
                            <p class="text-gray-600 font-mono text-sm flex items-center gap-2 truncate">
                                <span class="flex items-center shrink-0">\${flagHTML}</span>
                                <span class="truncate">\${escapeHtml(sim.number) || '未登记号码'}</span>
                            </p>
                            <span class="px-2.5 py-1 rounded-full text-[11px] font-bold shadow-sm whitespace-nowrap flex-shrink-0 \${badgeClass}">
                                <i class="fa-solid \${icon} mr-1"></i>\${statusText}
                            </span>
                        </div>
                        
                        \${remarkHTML}

                        \${platformsHTML}
                        
                        <div class="mt-auto">
                            <div class="flex justify-between text-sm font-semibold mb-2">
                                <span class="text-gray-700">剩余时间</span>
                                <span class="text-gray-900 font-bold \${diffDays <= advance && diffDays > 0 ? 'text-red-600 animate-pulse' : ''}">\${diffDays < 0 ? '0' : diffDays} 天</span>
                            </div>
                            <div class="w-full bg-gray-200/60 rounded-full h-3 mb-2 shadow-inner">
                                <div class="\${statusColor} h-3 rounded-full shadow-sm transition-all duration-1000" style="width: \${percent}%"></div>
                            </div>
                            <div class="flex justify-between text-xs text-gray-500 mt-2 font-medium">
                                <span><i class="fa-solid fa-arrows-rotate mr-1"></i>周期: \${sim.cycle || '-'} 天</span>
                                <span>到期日: \${sim.expireDate}</span>
                            </div>
                        </div>
                    </div>
                \`;
                container.innerHTML += cardHTML;
            });

            statsContainer.innerHTML = \`
                <div class="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-green-500">
                    <div>
                        <p class="text-gray-500 text-sm font-bold uppercase">安全卡片</p>
                        <p class="text-3xl font-black text-gray-800 mt-1">\${safeCount}</p>
                    </div>
                    <i class="fa-solid fa-shield-check text-4xl text-green-200"></i>
                </div>
                <div class="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-yellow-400">
                    <div>
                        <p class="text-gray-500 text-sm font-bold uppercase">建议关注</p>
                        <p class="text-3xl font-black text-gray-800 mt-1">\${warningCount}</p>
                    </div>
                    <i class="fa-solid fa-clock text-4xl text-yellow-200"></i>
                </div>
                <div class="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-red-500">
                    <div>
                        <p class="text-gray-500 text-sm font-bold uppercase">告警/过期</p>
                        <p class="text-3xl font-black text-gray-800 mt-1">\${dangerCount}</p>
                    </div>
                    <i class="fa-solid fa-siren-on text-4xl text-red-200"></i>
                </div>
            \`;
        }

        async function submitForm(e) {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>保存中...';
            btn.disabled = true;

            const payload = {
                name: document.getElementById('simName').value,
                number: document.getElementById('simNumber').value,
                cycle: parseInt(document.getElementById('simCycle').value) || 0,
                platforms: document.getElementById('simPlatforms').value, 
                remark: document.getElementById('simRemark').value,
                expireDate: document.getElementById('simExpire').value,
                notifyAdvance: document.getElementById('simNotifyAdvance').value,
                notifyInterval: document.getElementById('simNotifyInterval').value,
                notifyCount: document.getElementById('simNotifyCount').value
            };

            if (editingId) {
                payload.id = editingId;
            }

            try {
                const response = await fetch(WORKER_API_URL, {
                    method: editingId ? 'PUT' : 'POST', 
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });
                
                if (response.status === 401) { logout(); return; }
                if (response.ok) {
                    closeModal();
                    showToast(editingId ? "修改卡片成功" : "添加卡片成功");
                    await fetchEsimData(); 
                } else {
                    alert("保存失败，请检查数据。");
                }
            } catch (error) {
                alert("网络错误，保存失败。");
            } finally {
                btn.innerHTML = '保存并监控';
                btn.disabled = false;
            }
        }

        // ================= 加密保险库控制逻辑 =================
        async function unlockVault() {
            const pwdInput = document.getElementById('vaultPassword').value;
            if (!pwdInput) return alert("保险库密码不能为空！");
            
            const btn = document.getElementById('unlockVaultBtn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 派生密钥中...';
            btn.disabled = true;

            try {
                // 派生主密钥保存在内存中
                vaultMasterKey = await deriveCryptoKey(pwdInput);
                document.getElementById('vaultPassword').value = '';
                
                // 切换UI状态
                document.getElementById('vault-locked').classList.add('hidden');
                document.getElementById('vault-unlocked').classList.remove('hidden');
                document.getElementById('btn-lock-vault').classList.remove('hidden');
                document.getElementById('btn-add-account').classList.remove('hidden');
                document.getElementById('tab-lock-icon').className = "fa-solid fa-lock-open text-sm text-green-500 opacity-80";
                
                showToast("密钥派生成功，正在解密...");
                await fetchAccountData();
            } catch (e) {
                console.error(e);
                alert("解锁发生错误");
            } finally {
                btn.innerHTML = '<i class="fa-solid fa-key"></i> 本地派生密钥并解锁';
                btn.disabled = false;
            }
        }

        function lockVault() {
            vaultMasterKey = null; // 销毁内存中的密钥
            document.getElementById('vault-locked').classList.remove('hidden');
            document.getElementById('vault-unlocked').classList.add('hidden');
            document.getElementById('btn-lock-vault').classList.add('hidden');
            document.getElementById('btn-add-account').classList.add('hidden');
            document.getElementById('account-container').innerHTML = ''; // 清除 DOM 中的加密数据
            document.getElementById('tab-lock-icon').className = "fa-solid fa-lock text-sm opacity-50";
            
            showToast("保险库已锁定，密钥已从内存销毁");
        }

        // 密码相关操作
        function togglePasswordVisibility(inputId, iconId) {
            const input = document.getElementById(inputId);
            const icon = document.getElementById(iconId);
            if (input.type === "password") {
                input.type = "text";
                icon.className = "fa-solid fa-eye text-indigo-600";
            } else {
                input.type = "password";
                icon.className = "fa-solid fa-eye-slash";
            }
        }

        async function toggleDisplayPassword(id) {
            const span = document.getElementById('pwd-val-' + id);
            const icon = document.getElementById('pwd-icon-' + id);
            const encPwd = span.getAttribute('data-enc-pwd');
            
            if (span.innerText === '••••••••') {
                const realPwd = await decryptString(encPwd, vaultMasterKey);
                span.innerText = realPwd || '无密码';
                icon.className = "fa-solid fa-eye text-indigo-600";
                if(realPwd.includes('解密失败')) span.classList.add('text-red-500');
            } else {
                span.innerText = '••••••••';
                icon.className = "fa-solid fa-eye-slash";
                span.classList.remove('text-red-500');
            }
        }

        function copyToClipboard(text, typeName) {
            if (!text) return showToast("内容为空，无法复制");
            // 使用新版 API，如果不支持回退到临时 textarea (针对iframe环境优化)
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(text).then(() => showToast(typeName + "已复制到剪贴板"));
            } else {
                let textArea = document.createElement("textarea");
                textArea.value = text;
                textArea.style.position = "fixed";
                textArea.style.left = "-999999px";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                try {
                    document.execCommand('copy');
                    showToast(typeName + "已复制到剪贴板");
                } catch (err) {
                    console.error('Fallback: Oops, unable to copy', err);
                }
                document.body.removeChild(textArea);
            }
        }

        async function copyEncryptedPassword(id) {
            const span = document.getElementById('pwd-val-' + id);
            const encPwd = span.getAttribute('data-enc-pwd');
            const realPwd = await decryptString(encPwd, vaultMasterKey);
            if (realPwd.includes('解密失败')) {
                return showToast("解密失败，无法复制密码！");
            }
            copyToClipboard(realPwd, '密码');
        }

        async function fetchAccountData() {
            if (!vaultMasterKey) return; // 未解锁禁止获取
            const container = document.getElementById('account-container');
            
            try {
                const response = await fetch(WORKER_API_ACCOUNT_URL, { headers: getAuthHeaders() });
                if (response.status === 401) return;
                if (!response.ok) throw new Error("网络请求失败");
                
                accountData = await response.json();
                renderAccountCards(accountData);
            } catch (error) {
                console.error("加载账号数据失败:", error);
                container.innerHTML = \`
                    <div class="col-span-full text-center py-10">
                        <i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-3"></i>
                        <p class="text-gray-600">获取或解密账号数据失败，请重试。</p>
                    </div>\`;
            }
        }

        function renderAccountCards(accounts) {
            const container = document.getElementById('account-container');
            container.innerHTML = ''; 

            if(accounts.length === 0) {
                container.innerHTML = \`<div class="col-span-full text-center py-16 text-gray-500"><i class="fa-solid fa-box-archive text-4xl mb-3 text-indigo-200"></i><p>账号库为空，点击右上角“添加账号”记录您的数字资产！</p></div>\`;
                return;
            }

            // 按地区字母排序
            accounts.sort((a, b) => (a.region || '').localeCompare(b.region || ''));

            accounts.forEach(acc => {
                const remarkHTML = acc.remark ? \`<div class="bg-indigo-50/60 rounded-lg p-2.5 mt-4 text-xs text-gray-700 border border-indigo-100/60 break-words leading-relaxed whitespace-pre-wrap"><i class="fa-regular fa-comment-dots mr-1.5 text-indigo-400"></i>\${escapeHtml(acc.remark)}</div>\` : '';
                
                const cardHTML = \`
                    <div class="glass-card rounded-2xl p-6 relative overflow-hidden group flex flex-col h-full border-t-4 border-t-indigo-400">
                        
                        <div class="absolute top-4 right-4 flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 z-20 bg-white/80 p-1.5 rounded-full backdrop-blur-md border border-white/60 shadow-sm">
                            <button onclick="openEditAccountModal('\${acc.id}')" class="text-indigo-600 hover:text-white hover:bg-indigo-500 bg-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm" title="编辑账号">
                                <i class="fa-solid fa-pen text-sm"></i>
                            </button>
                            <button onclick="deleteAccount('\${acc.id}')" class="text-red-500 hover:text-white hover:bg-red-500 bg-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm" title="删除账号">
                                <i class="fa-solid fa-trash-can text-sm"></i>
                            </button>
                        </div>

                        <div class="pr-20 mb-4 flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0 shadow-inner">
                                <i class="fa-solid fa-shield-halved"></i>
                            </div>
                            <h2 class="text-lg font-bold text-gray-900 truncate" title="\${escapeHtml(acc.region)}">\${escapeHtml(acc.region)}</h2>
                        </div>
                        
                        <div class="flex flex-col gap-3">
                            <!-- 账号显示区 -->
                            <div>
                                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 block">账户/用户名</label>
                                <div class="font-mono text-sm bg-white/60 px-3 py-2.5 rounded-lg flex justify-between items-center border border-gray-100 shadow-sm">
                                    <span class="truncate pr-2 text-gray-800">\${escapeHtml(acc.account)}</span>
                                    <button onclick="copyToClipboard('\${escapeHtml(acc.account)}', '账户')" class="text-gray-400 hover:text-indigo-600 transition-colors shrink-0" title="复制账号">
                                        <i class="fa-regular fa-copy"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 密码显示区 -->
                            <div>
                                <label class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">加密密码 <i class="fa-solid fa-lock text-[10px] text-green-500"></i></label>
                                <div class="font-mono text-sm bg-white/60 px-3 py-2.5 rounded-lg flex justify-between items-center border border-gray-100 shadow-sm">
                                    <span id="pwd-val-\${acc.id}" data-enc-pwd="\${escapeHtml(acc.password)}" class="truncate pr-2 text-gray-800 \${acc.password ? '' : 'text-gray-400 italic'}">\${acc.password ? '••••••••' : '未设置'}</span>
                                    <div class="flex gap-3 shrink-0 \${!acc.password ? 'hidden' : ''}">
                                        <button onclick="toggleDisplayPassword('\${acc.id}')" class="text-gray-400 hover:text-indigo-600 transition-colors" title="即时解密/隐藏">
                                            <i id="pwd-icon-\${acc.id}" class="fa-solid fa-eye-slash"></i>
                                        </button>
                                        <button onclick="copyEncryptedPassword('\${acc.id}')" class="text-gray-400 hover:text-indigo-600 transition-colors" title="解密并复制">
                                            <i class="fa-regular fa-copy"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        \${remarkHTML}
                    </div>
                \`;
                container.innerHTML += cardHTML;
            });
        }

        function openAccountModal() {
            editingAccountId = null;
            document.getElementById('accountModalTitle').innerHTML = '<i class="fa-solid fa-vault text-indigo-600"></i> 新增加密账号';
            const modal = document.getElementById('accountModal');
            const content = document.getElementById('accountModalContent');
            document.getElementById('accountForm').reset();
            
            // 确保密码框处于隐藏状态
            document.getElementById('accPassword').type = "password";
            document.getElementById('accPwdIcon').className = "fa-solid fa-eye-slash";
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        async function openEditAccountModal(id) {
            const acc = accountData.find(a => a.id === id);
            if (!acc) return;
            
            editingAccountId = id;
            document.getElementById('accountModalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-indigo-600"></i> 编辑加密账号';
            
            document.getElementById('accRegion').value = acc.region || '';
            document.getElementById('accAccount').value = acc.account || '';
            document.getElementById('accRemark').value = acc.remark || '';
            
            // 填充前解密密码
            let plainPwd = '';
            if (acc.password) {
                plainPwd = await decryptString(acc.password, vaultMasterKey);
                if (plainPwd.includes('解密失败')) plainPwd = ''; // 防错
            }
            document.getElementById('accPassword').value = plainPwd;
            
            document.getElementById('accPassword').type = "password";
            document.getElementById('accPwdIcon').className = "fa-solid fa-eye-slash";

            const modal = document.getElementById('accountModal');
            const content = document.getElementById('accountModalContent');
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        function closeAccountModal() {
            const modal = document.getElementById('accountModal');
            const content = document.getElementById('accountModalContent');
            
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                editingAccountId = null;
            }, 300); 
        }

        async function submitAccountForm(e) {
            e.preventDefault();
            const btn = document.getElementById('submitAccountBtn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>加密中...';
            btn.disabled = true;

            try {
                // 拦截表单，对密码进行强加密
                const plainPwd = document.getElementById('accPassword').value;
                const encryptedPwd = await encryptString(plainPwd, vaultMasterKey);

                const payload = {
                    region: document.getElementById('accRegion').value,
                    account: document.getElementById('accAccount').value,
                    password: encryptedPwd, // 传输密文
                    remark: document.getElementById('accRemark').value
                };

                if (editingAccountId) {
                    payload.id = editingAccountId;
                }

                const response = await fetch(WORKER_API_ACCOUNT_URL, {
                    method: editingAccountId ? 'PUT' : 'POST', 
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });
                
                if (response.status === 401) { logout(); return; }
                if (response.ok) {
                    closeAccountModal();
                    showToast(editingAccountId ? "账号修改成功 (已加密存储)" : "账号添加成功 (已加密存储)");
                    await fetchAccountData(); 
                } else {
                    alert("保存失败，请检查数据。");
                }
            } catch (error) {
                alert("网络错误或加密失败。");
                console.error(error);
            } finally {
                btn.innerHTML = '<i class="fa-solid fa-lock"></i> 加密并保存';
                btn.disabled = false;
            }
        }

        function deleteAccount(id) {
            openConfirmModal({
                title: '确认删除账号',
                message: '确定要删除这个账号记录吗？此操作无法恢复。',
                btnText: '<i class="fa-solid fa-trash-can"></i> 确定删除',
                btnClass: 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30',
                iconBgClass: 'bg-red-50/80 border border-red-100',
                iconClass: 'fa-trash-can text-3xl text-red-500',
                onConfirm: async () => {
                    const btn = document.getElementById('confirmActionBtn');
                    const origText = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 删除中...';
                    btn.disabled = true;
                    
                    try {
                        const response = await fetch(WORKER_API_ACCOUNT_URL, {
                            method: 'DELETE',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ id: id })
                        });
                        
                        if (response.status === 401) { logout(); return; }
                        if (response.ok) {
                            closeConfirmModal();
                            showToast("账号已删除");
                            await fetchAccountData(); 
                        } else {
                            alert("删除失败。");
                            btn.innerHTML = origText;
                            btn.disabled = false;
                        }
                    } catch (error) {
                        alert("网络错误，删除失败。");
                        btn.innerHTML = origText;
                        btn.disabled = false;
                    }
                }
            });
        }


        // ================= 统一确认弹窗功能 =================
        function openConfirmModal(options) {
            document.getElementById('confirmTitle').innerText = options.title || '确认操作';
            document.getElementById('confirmMessage').innerText = options.message || '确定要执行此操作吗？';
            
            const btn = document.getElementById('confirmActionBtn');
            btn.innerHTML = options.btnText || '确定';
            btn.className = "flex-1 font-bold py-3 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 " + (options.btnClass || "bg-red-500 hover:bg-red-600 text-white shadow-red-500/30");
            
            const iconBg = document.getElementById('confirmIconBg');
            iconBg.className = "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm " + (options.iconBgClass || "bg-red-50/80 border border-red-100");
            
            const icon = document.getElementById('confirmIcon');
            icon.className = "fa-solid " + (options.iconClass || "fa-triangle-exclamation text-3xl text-red-500");

            btn.onclick = async () => {
                if (options.onConfirm) {
                    await options.onConfirm();
                }
            };

            const modal = document.getElementById('confirmModal');
            const content = document.getElementById('confirmModalContent');
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        function closeConfirmModal() {
            const modal = document.getElementById('confirmModal');
            const content = document.getElementById('confirmModalContent');
            
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300); 
        }

        function renewEsim(id, cycle) {
            if (!cycle || cycle === 0) {
                alert("该卡片未设置保号周期，无法自动计算日期。请直接点击编辑修改。");
                return;
            }
            
            openConfirmModal({
                title: '一键续期',
                message: '确定已保号并一键续期吗？\\n\\n系统将以【今天】为基准，往后顺延 ' + cycle + ' 天作为新的到期日。',
                btnText: '<i class="fa-solid fa-rotate-right"></i> 确定续期',
                btnClass: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30',
                iconBgClass: 'bg-blue-50/80 border border-blue-100',
                iconClass: 'fa-rotate-right text-3xl text-blue-500',
                onConfirm: async () => {
                    const btn = document.getElementById('confirmActionBtn');
                    const origText = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 处理中...';
                    btn.disabled = true;

                    const newDate = new Date();
                    newDate.setDate(newDate.getDate() + parseInt(cycle));
                    const year = newDate.getFullYear();
                    const month = String(newDate.getMonth() + 1).padStart(2, '0');
                    const day = String(newDate.getDate()).padStart(2, '0');
                    const newExpireStr = year + '-' + month + '-' + day;

                    try {
                        const response = await fetch(WORKER_API_URL, {
                            method: 'PUT',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ id: id, expireDate: newExpireStr })
                        });
                        
                        if (response.status === 401) { logout(); return; }
                        if (response.ok) {
                            closeConfirmModal();
                            showToast("卡片已顺延续期");
                            await fetchEsimData(); 
                        } else {
                            alert("续期失败。");
                            btn.innerHTML = origText;
                            btn.disabled = false;
                        }
                    } catch (error) {
                        alert("网络错误，续期失败。");
                        btn.innerHTML = origText;
                        btn.disabled = false;
                    }
                }
            });
        }

        function deleteEsim(id) {
            openConfirmModal({
                title: '确认删除',
                message: '确定要删除这个号码记录吗？此操作无法恢复。',
                btnText: '<i class="fa-solid fa-trash-can"></i> 确定删除',
                btnClass: 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30',
                iconBgClass: 'bg-red-50/80 border border-red-100',
                iconClass: 'fa-trash-can text-3xl text-red-500',
                onConfirm: async () => {
                    const btn = document.getElementById('confirmActionBtn');
                    const origText = btn.innerHTML;
                    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 删除中...';
                    btn.disabled = true;
                    
                    try {
                        const response = await fetch(WORKER_API_URL, {
                            method: 'DELETE',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ id: id })
                        });
                        
                        if (response.status === 401) { logout(); return; }
                        if (response.ok) {
                            closeConfirmModal();
                            showToast("卡片已删除");
                            await fetchEsimData(); 
                        } else {
                            alert("删除失败。");
                            btn.innerHTML = origText;
                            btn.disabled = false;
                        }
                    } catch (error) {
                        alert("网络错误，删除失败。");
                        btn.innerHTML = origText;
                        btn.disabled = false;
                    }
                }
            });
        }

        function openModal() {
            editingId = null;
            document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-file-circle-plus text-blue-600"></i> 新增 eSIM';
            const modal = document.getElementById('addModal');
            const content = document.getElementById('modalContent');
            document.getElementById('addForm').reset(); 
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        function openEditModal(id) {
            const sim = esimData.find(s => s.id === id);
            if (!sim) return;
            
            editingId = id;
            document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-green-600"></i> 编辑 eSIM';
            
            document.getElementById('simName').value = sim.name || '';
            document.getElementById('simNumber').value = sim.number || '';
            document.getElementById('simCycle').value = sim.cycle || '';
            document.getElementById('simPlatforms').value = sim.platforms || ''; 
            document.getElementById('simRemark').value = sim.remark || '';
            document.getElementById('simExpire').value = sim.expireDate || '';
            
            document.getElementById('simNotifyAdvance').value = sim.notifyAdvance !== undefined ? sim.notifyAdvance : '';
            document.getElementById('simNotifyInterval').value = sim.notifyInterval !== undefined ? sim.notifyInterval : '';
            document.getElementById('simNotifyCount').value = sim.notifyCount !== undefined ? sim.notifyCount : '';

            const modal = document.getElementById('addModal');
            const content = document.getElementById('modalContent');
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        function closeModal() {
            const modal = document.getElementById('addModal');
            const content = document.getElementById('modalContent');
            
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                editingId = null;
            }, 300); 
        }
    </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (path === "/" || path === "/index.html") {
      return new Response(HTML_CONTENT, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    let tgToken = env.TG_BOT_TOKEN;
    let tgChat = env.TG_CHAT_ID;
    
    try {
      if (!tgToken) tgToken = await env.ESIM_DB.get("TG_BOT_TOKEN");
      if (!tgChat) tgChat = await env.ESIM_DB.get("TG_CHAT_ID");
    } catch (e) {}

    if (path === "/api/auth/send" && request.method === "POST") {
      try {
        if (!tgToken || !tgChat) {
          let missingVars = [];
          if (!tgToken) missingVars.push("TG_BOT_TOKEN");
          if (!tgChat) missingVars.push("TG_CHAT_ID");
          return new Response(JSON.stringify({ 
              success: false, 
              message: `环境缺失：缺少 ${missingVars.join(' 和 ')}。请前往 Cloudflare 的 KV 数据库中手动添加这两个键值对即可彻底解决！` 
          }), { status: 500, headers: corsHeaders });
        }
        
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        await env.ESIM_DB.put("admin_auth_code", code, { expirationTtl: 300 });
        await env.ESIM_DB.put("admin_auth_attempts", "0", { expirationTtl: 300 }); 

        const text = `🔐 <b>【eSIM 看板安全验证】</b>\n\n有人正在尝试登录您的网页版数据面板。\n\n您的动态登录验证码是：<code>${code}</code>\n\n<i>(该验证码 5 分钟内有效。如非本人操作，请忽略，系统已开启防爆破保护)</i>`;
        const tgUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;
        const tgRes = await fetch(tgUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: tgChat, text: text, parse_mode: "HTML" })
        });

        if (tgRes.ok) {
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } else {
          return new Response(JSON.stringify({ success: false, message: "TG 消息发送失败，可能 Bot 被拉黑或未激活" }), { status: 500, headers: corsHeaders });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    if (path === "/api/auth/verify" && request.method === "POST") {
      try {
        const { code } = await request.json();
        const storedCode = await env.ESIM_DB.get("admin_auth_code");
        
        let attempts = parseInt(await env.ESIM_DB.get("admin_auth_attempts")) || 0;
        if (attempts >= 5) {
            await env.ESIM_DB.delete("admin_auth_code"); 
            return new Response(JSON.stringify({ success: false, message: "错误次数过多，为保障安全，验证码已强制作废。请重新获取！" }), { status: 403, headers: corsHeaders });
        }

        if (!storedCode) {
            return new Response(JSON.stringify({ success: false, message: "请先获取验证码或验证码已过期" }), { status: 400, headers: corsHeaders });
        }
        
        if (code && storedCode === code.toString()) {
          const token = crypto.randomUUID();
          await env.ESIM_DB.put("session_token_" + token, "valid", { expirationTtl: 2592000 });
          await env.ESIM_DB.delete("admin_auth_code");
          await env.ESIM_DB.delete("admin_auth_attempts"); 
          
          return new Response(JSON.stringify({ success: true, token: token }), { headers: corsHeaders });
        } else {
          attempts++;
          await env.ESIM_DB.put("admin_auth_attempts", attempts.toString(), { expirationTtl: 300 });
          await new Promise(resolve => setTimeout(resolve, 1000)); 
          
          return new Response(JSON.stringify({ success: false, message: `验证码错误！剩余尝试次数: ${5 - attempts} 次` }), { status: 401, headers: corsHeaders });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: "校验失败" }), { status: 500, headers: corsHeaders });
      }
    }

    // ================= eSIM 路由 =================
    if (path === "/api/esims") {
      const reqToken = request.headers.get("Authorization");
      if (!reqToken) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      
      const isValidSession = await env.ESIM_DB.get("session_token_" + reqToken);
      if (!isValidSession) return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401, headers: corsHeaders });

      let esims;
      try {
        esims = await env.ESIM_DB.get("esim_list", { type: "json" });
        if (!esims) esims = []; 
      } catch (err) {
        return new Response(JSON.stringify({ error: "KV 未绑定" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (request.method === "GET") {
        return new Response(JSON.stringify(esims), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (request.method === "POST") {
        try {
          const newSim = await request.json();
          if (!newSim.name || !newSim.expireDate) return new Response(JSON.stringify({ success: false, message: "参数错误" }), { status: 400, headers: corsHeaders });
          newSim.id = Date.now().toString(); 
          esims.push(newSim);
          await env.ESIM_DB.put("esim_list", JSON.stringify(esims)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) { return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders }); }
      }

      if (request.method === "PUT") {
        try {
          const { id, expireDate, name, number, cycle, remark, platforms, notifyAdvance, notifyInterval, notifyCount } = await request.json();
          let found = false;
          esims = esims.map(sim => {
            if (sim.id === id) { 
                found = true; 
                if (expireDate !== undefined) sim.expireDate = expireDate;
                if (name !== undefined) sim.name = name;
                if (number !== undefined) sim.number = number;
                if (cycle !== undefined) sim.cycle = cycle;
                if (remark !== undefined) sim.remark = remark;
                if (platforms !== undefined) sim.platforms = platforms; 
                if (notifyAdvance !== undefined) sim.notifyAdvance = notifyAdvance;
                if (notifyInterval !== undefined) sim.notifyInterval = notifyInterval;
                if (notifyCount !== undefined) sim.notifyCount = notifyCount;
                return sim; 
            }
            return sim;
          });
          if (!found) return new Response(JSON.stringify({ success: false, message: "未找到记录" }), { status: 404, headers: corsHeaders });
          await env.ESIM_DB.put("esim_list", JSON.stringify(esims)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) { return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders }); }
      }

      if (request.method === "DELETE") {
        try {
          const { id } = await request.json();
          esims = esims.filter(sim => sim.id !== id);
          await env.ESIM_DB.put("esim_list", JSON.stringify(esims)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) { return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders }); }
      }
    }

    // ================= 账号库 路由 =================
    if (path === "/api/accounts") {
      const reqToken = request.headers.get("Authorization");
      if (!reqToken) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
      
      const isValidSession = await env.ESIM_DB.get("session_token_" + reqToken);
      if (!isValidSession) return new Response(JSON.stringify({ error: "Invalid Token" }), { status: 401, headers: corsHeaders });

      let accounts;
      try {
        accounts = await env.ESIM_DB.get("account_list", { type: "json" });
        if (!accounts) accounts = []; 
      } catch (err) {
        return new Response(JSON.stringify({ error: "KV 未绑定" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (request.method === "GET") {
        return new Response(JSON.stringify(accounts), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      if (request.method === "POST") {
        try {
          const newAcc = await request.json();
          if (!newAcc.region || !newAcc.account) return new Response(JSON.stringify({ success: false, message: "参数错误" }), { status: 400, headers: corsHeaders });
          newAcc.id = 'acc_' + Date.now().toString(); 
          accounts.push(newAcc);
          await env.ESIM_DB.put("account_list", JSON.stringify(accounts)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) { return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders }); }
      }

      if (request.method === "PUT") {
        try {
          const { id, region, account, password, remark } = await request.json();
          let found = false;
          accounts = accounts.map(acc => {
            if (acc.id === id) { 
                found = true; 
                if (region !== undefined) acc.region = region;
                if (account !== undefined) acc.account = account;
                if (password !== undefined) acc.password = password;
                if (remark !== undefined) acc.remark = remark;
                return acc; 
            }
            return acc;
          });
          if (!found) return new Response(JSON.stringify({ success: false, message: "未找到记录" }), { status: 404, headers: corsHeaders });
          await env.ESIM_DB.put("account_list", JSON.stringify(accounts)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) { return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders }); }
      }

      if (request.method === "DELETE") {
        try {
          const { id } = await request.json();
          accounts = accounts.filter(acc => acc.id !== id);
          await env.ESIM_DB.put("account_list", JSON.stringify(accounts)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) { return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders }); }
      }
    }

    return new Response("404 Not Found", { status: 404 });
  },

  async scheduled(event, env, ctx) {
    let tgToken = env.TG_BOT_TOKEN;
    let tgChat = env.TG_CHAT_ID;
    try {
      if (!tgToken) tgToken = await env.ESIM_DB.get("TG_BOT_TOKEN");
      if (!tgChat) tgChat = await env.ESIM_DB.get("TG_CHAT_ID");
    } catch (e) {}

    const esims = await env.ESIM_DB.get("esim_list", { type: "json" });
    if (!esims || esims.length === 0) return; 

    const today = new Date();
    const offset = 8; 
    const localToday = new Date(today.getTime() + offset * 3600 * 1000);
    localToday.setUTCHours(0, 0, 0, 0);

    let messages = [];

    esims.forEach(sim => {
      const expDate = new Date(sim.expireDate);
      expDate.setUTCHours(0, 0, 0, 0); 
      
      const diffTime = expDate - localToday;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const cycleText = sim.cycle ? `${sim.cycle}天` : '未设置';
      const remarkText = sim.remark ? `\n📝 备注: ${sim.remark}` : ''; 
      const platformsText = sim.platforms ? `\n🌐 平台: ${sim.platforms}` : ''; 

      // 动态解析自定义提醒规则，采用极其高效的数学推演判定算法（无需在数据库读写记录次数的脏状态）
      const advance = sim.notifyAdvance !== undefined && sim.notifyAdvance !== "" ? parseInt(sim.notifyAdvance) : 15;
      const interval = sim.notifyInterval !== undefined && sim.notifyInterval !== "" ? parseInt(sim.notifyInterval) : 1;
      const maxCount = sim.notifyCount !== undefined && sim.notifyCount !== "" ? parseInt(sim.notifyCount) : 0;

      if (diffDays <= advance && diffDays > 0) {
        const passedDays = advance - diffDays;
        
        // 当过去的天数正好是间隔的倍数时，触发当次校验
        if (passedDays % interval === 0) {
            let shouldNotify = false;
            let currentCount = Math.floor(passedDays / interval) + 1;
            
            // 校验是否超出了允许的最大提醒次数
            if (maxCount === 0 || currentCount <= maxCount) {
                shouldNotify = true;
            }

            if (shouldNotify) {
                let notifyProgress = maxCount > 0 ? ` (第 ${currentCount}/${maxCount} 次)` : '';
                messages.push(`⚠️ 【eSIM 保号提醒】${notifyProgress}\n📱 卡名: ${sim.name}\n📞 号码: ${sim.number || '未填写'}\n🔄 周期: ${cycleText}\n📅 到期: ${sim.expireDate}${remarkText}${platformsText}\n⏳ 剩余: ${diffDays} 天！\n👉 请尽快处理续期！`);
            }
        }
      } else if (diffDays === 0) {
        messages.push(`🚨 【eSIM 紧急提醒】\n📱 卡名: ${sim.name} 今天到期！${remarkText}${platformsText}`);
      } else if (diffDays < 0 && Math.abs(diffDays) % 7 === 0) {
        messages.push(`❌ 【eSIM 停机警告】\n📱 卡名: ${sim.name} 已过期 ${Math.abs(diffDays)} 天。${remarkText}${platformsText}`);
      }
    });

    if (messages.length > 0 && tgToken && tgChat) {
      const text = messages.join("\n\n---\n\n");
      const tgUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;
      await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: tgChat, 
          text: text, 
          parse_mode: "HTML" 
        })
      });
    }
  }
};
