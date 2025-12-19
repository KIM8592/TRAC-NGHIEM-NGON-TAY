// Màn hình
function showScreen(id){
  document.querySelectorAll("section").forEach(s=>s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// Dữ liệu
let questions = [];
let currentQ = 0;
let mode = "idle";
let questionLocked = false;
let lastGesture = "";
let fistStart = null;

// ===== ÂM THANH =====
const soundCorrect = new Audio("dung.mp3");
const soundWrong = new Audio("sai.mp3");

// Load từ localStorage
window.addEventListener("DOMContentLoaded", () => {
  const savedQ = localStorage.getItem("questions");
  if(savedQ){
    questions = JSON.parse(savedQ);
    document.getElementById("qCount").innerText =
      "Đã tạo " + questions.length + " câu hỏi (lần trước)";
  }
});

// Thêm câu hỏi
function addQuestion(){
  const qText = document.getElementById("qText").value;
  const opts = document.querySelectorAll(".opt");
  const correct = document.getElementById("correct").value;
  const file = document.getElementById("qImage").files[0];

  if(!qText || correct===""){
    alert("Thiếu câu hỏi hoặc đáp án đúng");
    return;
  }

  let answers = [];
  for(let o of opts){
    if(!o.value){ alert("Thiếu đáp án"); return; }
    answers.push(o.value);
  }

  if(file){
    const reader = new FileReader();
    reader.onload = function(e){
      questions.push({
        question:qText,
        image:e.target.result,
        options:answers,
        correct:Number(correct)
      });
      saveQuestions();
    }
    reader.readAsDataURL(file);
  } else {
    questions.push({question:qText, image:null, options:answers, correct:Number(correct)});
    saveQuestions();
  }

  document.getElementById("qText").value="";
  opts.forEach(o=>o.value="");
  document.getElementById("correct").value="";
  document.getElementById("qImage").value="";
}

// Lưu localStorage
function saveQuestions(){
  localStorage.setItem("questions", JSON.stringify(questions));
  document.getElementById("qCount").innerText = "Đã tạo " + questions.length + " câu hỏi";
}

// Xóa tất cả câu hỏi
function resetQuestions(){
  if(confirm("Bạn có chắc muốn xóa tất cả câu hỏi?")){
    questions=[];
    localStorage.removeItem("questions");
    document.getElementById("qCount").innerText="";
  }
}

// Quiz
function startQuiz(){
  if(questions.length===0){ alert("Chưa có câu hỏi"); return; }
  mode="quiz";
  currentQ=0;
  showQuestion();
}

function showQuestion(){
  const q = questions[currentQ];
  document.getElementById("quizQuestion").innerText = q.question;
  const img = document.getElementById("quizImage");
  if(q.image){ img.src = q.image; img.style.display="block"; }
  else{ img.style.display="none"; }

  const box = document.getElementById("quizOptions");
  box.innerHTML="";

  q.options.forEach((opt,i)=>{
    const btn = document.createElement("button");
    btn.innerText = opt;
    btn.onclick = ()=>checkAnswer(i);
    box.appendChild(btn);
  });


  questionLocked=false;
  document.getElementById("quizResult").innerText="";
}

function checkAnswer(i){
  const q = questions[currentQ];
  const btns = document.querySelectorAll("#quizOptions button");
  if(questionLocked) return;

  if(i===q.correct){
    btns[i].classList.add("correct");
    document.getElementById("quizResult").innerText="✅ ĐÚNG";
    questionLocked=true;
soundCorrect.play(); // phát âm thanh đúng
  } else {
    btns[i].classList.add("wrong");
    document.getElementById("quizResult").innerText="❌ SAI";
    questionLocked=true;
soundWrong.play(); // phát âm thanh sai
    setTimeout(()=>{
      btns[i].classList.remove("wrong");
      document.getElementById("quizResult").innerText="";
      questionLocked=false;
    },3000);
  }
}

function nextQuestion(){
  currentQ++;
  if(currentQ>=questions.length){
    document.getElementById("quizQuestion").innerText="🎉 HẾT CÂU HỎI";
    document.getElementById("quizOptions").innerHTML="";
    questionLocked=true;
    return;
  }
  showQuestion();
  questionLocked=false;
}

// HAND TRACKING
function countFingers(hand){
  const tips=[8,12,16,20]; let count=0;
  tips.forEach(i=>{ if(hand[i].y<hand[i-2].y) count++; });
  return count;
}

function onResults(results){
  if(!results.multiHandLandmarks || results.multiHandLandmarks.length===0){ 
    fistStart=null; 
    return; 
  }

  const hand = results.multiHandLandmarks[0];
  const fingers = countFingers(hand);

  // ✊ NẮM TAY 2s → bắt đầu hoặc sang câu mới
  if(fingers===0){
    if(!fistStart) fistStart=Date.now();
    if(Date.now()-fistStart>2000){
      fistStart=null;
      if(mode!=="quiz" && questions.length>0){
        // bắt đầu quiz
        mode="quiz";
        currentQ=0;
        showQuestion();
      }else if(mode==="quiz"){
        // sang câu mới
        nextQuestion();
      }
    }
    return;
  } else fistStart=null;

  // CHỌN đáp án 1-4
  if(mode==="quiz" && fingers>=1 && fingers<=4 && lastGesture!==fingers){
    lastGesture=fingers;
    if(!questionLocked){
      const btns=document.querySelectorAll("#quizOptions button");
      if(btns[fingers-1]) btns[fingers-1].click();
    }
    setTimeout(()=>lastGesture="",1000);
  }
}

// Camera
const hands=new Hands({ locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`});
hands.setOptions({
  maxNumHands:1, modelComplexity:1,
  minDetectionConfidence:0.7,
  minTrackingConfidence:0.7
});
hands.onResults(onResults);
const camera=new Camera(document.getElementById("inputVideo"),{
  onFrame: async()=>{ await hands.send({image:inputVideo}); },
  width:640, height:480
});
camera.start();
