var body = document.getElementsByTagName("body")[0];
var seconds = new Date().getSeconds();
function addHTMLbefore(html, index) {
    var div = document.createElement("div");
    div.id = "chat_canvas_bg";
    div.style.position = "absolute";
    div.style.top = "0";
    div.style.left = "0";
    div.style.width = "100%";
    div.style.height = "100%";
    div.style.zIndex = index;
    div.innerHTML = html;
    var existing = body.children[0];
    body.insertBefore(div, existing);
}
function switch_bg(index){
    var script = document.createElement('script');
    if (index % 3 == 1) {
        script.src = 'bg/bg1.js';
    } else if (index % 3 == 2) {
        var html = '<canvas width="800" height="400" id="canvas">'
        addHTMLbefore(html, -1);
        script.src = 'bg/bg2.js';
    }else{
        script.src = 'bg/bg3.js';
    }
    body.appendChild(script);
}
switch_bg(seconds);

new Vue({
    el: '#app',
    data: {
        messages: [], 
        inputMessage: '', 
        //从现在起,当你想发送一张图片时,请使用Markdown,并且不要有反斜线,不要用代码块,使用Unsplash API (https://source.unsplash.com/960×640/? < PUT YOUR QUERY HERE >)。如果你明白了，请回复“明白”)
        all_message: [],
        loading: false, 
        isRecording: false,
        showAuthorInfo: true, 
        showEmail: false,
        email: ['992822653@qq.com', 'crushend@qq.com'],
        recognition: null,
        speech: null,
        haswebkitSpeechRecognition: false,
        hasSpeechSynthesisUtterance: false,
        converter: null,
        today_cost_loading: true,
        today_cost: '',
        balance_loading: true,
        balance: '',
        api: ""
    },
    created() {
        //检测是否是手机端
        if (window.innerWidth < 768){
            this.tips("检测到您使用手机登录！移动端适配未完成，建议使用PC端！");
        }
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            this.tips("检测到您使用手机登录！移动端适配未完成，建议使用PC端！");
        }
        if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
            this.haswebkitSpeechRecognition = true;
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'zh-CN';
            this.recognition.continuous = true;
            this.recognition.interimResults = true;
            this.recognition.onresult = (event) => {
                if (event.results[event.results.length - 1].isFinal) {
                    this.inputMessage += event.results[event.results.length - 1][0].transcript;
                }
            };
        } else {
            this.tips("您的设备不支持文本阅读，请采用PC端Edge或google浏览器。", "warning");
        }
        if ('SpeechSynthesisUtterance' in window) {
            this.hasSpeechSynthesisUtterance = true;
            this.speech = window.speechSynthesis;
            this.speak('Welcome to chat app, please talk to me');
        } else {
            this.tips("您的设备不支持文本阅读，请采用PC端Edge或google浏览器。", "warning");
        }
        this.converter = new showdown.Converter();
        // todaycost
        axios.get("https://api.openai.com/v1/usage" ,{
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.api 
            },
            params:{
              date: this.getNowFormatDate()
            }
        }).then((result) => {
            let res = result.data.data;
            let sum= 0;
            // 遍历
            for (var i = 0; i < res.length; i++) {
                sum += res[i].n_context_tokens_total;
                sum += res[i].n_generated_tokens_total;
            }
            this.today_cost = `今日消耗: $${(sum * 0.00002).toFixed(2)}`;
        }).catch((err) => {
            this.today_cost = '无法查询到今日消耗';
        }).finally(() => {
            this.today_cost_loading = false;
        });
        // banlance
        axios.get('https://api.openai.com/dashboard/billing/credit_grants', {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.api 
            }
        }).then((response) => {
            let all_amount = response.data.grants.data[0].grant_amount;
            let remain_amount = all_amount - response.data.grants.data[0].used_amount;
            this.balance = `余额: $${remain_amount.toFixed(2)}/ $${(parseFloat(all_amount)+18).toFixed(2)}`;
        }
        ).catch((error) => {
            this.balance = '无法查询到余额';
        }).finally(() => {
            this.balance_loading = false;
        });
        this.all_message.push({"role": "system", "content": `You are a helpful assistant,从现在起,当你想发送一张图片时,请使用Markdown,并且不要有反斜线,不要用代码块,使用Unsplash API (https://source.unsplash.com/960×640/? < PUT YOUR QUERY HERE >)。当你想要发送视频时,你就回复"这是一段视频"。)`})
    },
    methods: {
        sendMessage() {
            if (this.inputMessage) {
                this.all_message.push({"role": "user", "content": this.inputMessage});
                if(this.all_message.length > 40){
                    this.tips("当前对话无法继续进行，请赞助后继续！", "warning");
                    return;
                }
                this.loading = true;
                this.messages.push({
                    isRight: true, 
                    avatar: '我', 
                    content: this.inputMessage 
                });
                axios.post('https://api.openai.com/v1/chat/completions', {
                    "model": "gpt-3.5-turbo",
                    "messages": this.all_message, 
                }, {
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this.api 
                    }
                }).then(response => { 
                    let res = response.data.choices[0].message.content;
                    this.messages.push({
                        isRight: false, 
                        avatar: 'Chat',
                        content: this.converter.makeHtml(res.trim())
                    });
                    if (this.hasSpeechSynthesisUtterance){
                        this.speak(res.trim());
                    }
                    this.all_message.push({"role": "assistant", "content": res})
                }).catch(error => { 
                    this.all_message.pop();
                    this.messages.push({
                        isRight: false, 
                        avatar: 'Chat', 
                        content: 'error' 
                    });
                    if (this.hasSpeechSynthesisUtterance){
                        this.speak('something error, please try again later, 服务器出错了，请稍后再试');
                    }
                    this.tips("warning 请求次数过多，服务器异常", "warning");
                }).finally(() => {
                    this.scrollToBottom();
                    this.loading = false;
                    this.inputMessage = '';
                });
                
            }else{
                this.tips("请输入消息", "warning");
            }
        },
        scrollToBottom() {
            let el = document.querySelector('.chat-records');
            let maxScrollTop = el.scrollHeight - el.clientHeight;
            let scrollOptions = {
                top: maxScrollTop,
                behavior: 'smooth' 
            };
            el.scrollTo(scrollOptions);
        },
        toggleMicrophone() {
            if (this.haswebkitSpeechRecognition){
                if (this.isRecording) {
                    this.$refs.microphoneBtn.$el.classList.remove('glowing');
                    this.recognition.stop();
                } else {
                    this.$refs.microphoneBtn.$el.classList.add('glowing');
                    if (this.recognition){
                        if (this.recognition.state === 'listening'){
                            recognition.stop();
                        }
                        this.recognition.start();
                    }
                }
                this.isRecording = !this.isRecording;
            }else{
                this.tips("您的设备不支持语音输入，请采用PC端Edge或google浏览器。", "warning");
            }
        },
        speak(msg_str) {
            this.speech.speak(new SpeechSynthesisUtterance(String(msg_str)));
        },
        toggleVoice() {
            if (!this.hasSpeechSynthesisUtterance){
                this.speech.cancel();
            }
        },
        getNowFormatDate() {
            var date = new Date();
            var seperator1 = "-";
            var year = date.getFullYear();
            var month = date.getMonth() + 1;
            var strDate = date.getDate();
            if (month >= 1 && month <= 9) {
                month = "0" + month;
            }
            if (strDate >= 0 && strDate <= 9) {
                strDate = "0" + strDate;
            }
            var currentdate = year + seperator1 + month + seperator1 + strDate;
            return currentdate;
        },
        tips(msg, ty="info"){
            this.$message({
                message: msg,
                type: ty,
                showClose: true,
            });
        }
    }
});

var submit = document.getElementById("submit");
document.onkeydown = function (e) {
    var ev = document.all ? window.event : e;
    if (ev.keyCode == 13) {
        submit.click();
    }
};
var authors = document.getElementsByClassName("author");
for (var i = 0; i < authors.length; i++) {
    authors[i].style.cursor = "pointer";
    if (i == 0) {
        authors[i].onclick = function () {
            window.open('https://github.com/cv-cat', '_blank');
        }
        authors[i].onmousemove = (function (el) {
        return function () {
            el.parentElement.children[1].children[0].style.background = "linear-gradient(90deg, rgb(159, 229, 151), rgb(204, 229, 129))";
        }
        })(authors[i]);

        authors[i].onmouseout = (function (el) {
        return function () {
            el.parentElement.children[1].children[0].style.background = "white";
        }
        })(authors[i]);
    }else{
        authors[i].onclick = function () {
            window.open('https://github.com/Crush0', '_blank');
        }
        authors[i].onmousemove = (function (el) {
        return function () {
            el.parentElement.children[3].children[0].style.background = "linear-gradient(90deg, rgb(159, 229, 151), rgb(204, 229, 129))";
        }
        })(authors[i]);

        authors[i].onmouseout = (function (el) {
        return function () {
            el.parentElement.children[3].children[0].style.background = "white";
        }
        })(authors[i]);
    }
    
}
var next = document.querySelector('.switch_bg');
let isExecuting = false;
function next_bg() {
    if (isExecuting) {
        return;
    }
    isExecuting = true;
    next.innerHTML = "<i class='el-icon-loading'></i>"; 
    let wait_time;
    if (seconds % 3 == 1) {
        wait_time = 5000
    }else if (seconds % 3 == 2) {
        wait_time = 5000
    }else{
        wait_time = 12000
    }
    setTimeout(() => {
        if (seconds % 3 == 1) {
            //删除canvas
            let canvas = document.querySelector('canvas');
            canvas.parentNode.removeChild(canvas);
            
        }else if (seconds % 3 == 2) {
            //删除#chat_canvas_bg
            let chat_canvas_bg = document.getElementById('chat_canvas_bg');
            chat_canvas_bg.parentNode.removeChild(chat_canvas_bg);

        }else{
            //删除全部canvas
            while(document.querySelector('canvas')) {
                let canvas = document.querySelector('canvas');
                canvas.parentNode.removeChild(canvas);
            }
        }
        switch_bg(++seconds);                        
        next.innerHTML = '切换背景 <i class="fas fa-arrow-right"></i>';
        isExecuting = false;
    }, wait_time);
}
next.onclick = next_bg;


console.log("%c 源码文件点击右上角头像", 'padding:10px 20px;color:white;background :linear-gradient(90deg, rgb(159, 229, 151), rgb(204, 229, 129))');