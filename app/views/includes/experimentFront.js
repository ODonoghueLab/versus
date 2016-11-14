<script type="text/javascript">

/* eslint-disable */
$(document).ready( () => {

  //Setup Page
  $('#experiment').slideUp(0);

  //Start
  $('[name="startButton"]').click(function(){

    //animation
    $('#experimentStart').slideUp(150,()=>{

      //recieve first two in buffer
      get(JSON.stringify({ "start": true }), (data) => {
        if(typeof data !== typeof undefined){

          //append DOM
          $('[name="ButtonA"]').attr("value", data.itemA.value).attr("src", data.itemA.url);
          $('[name="ButtonB"]').attr("value", data.itemB.value).attr("src", data.itemB.url);

        }
      });

      $('#experiment').slideDown(150);
    })

  });


  //Choices
  //If we pick A, change B
  $('[name="ButtonA"]').click(function(){
    get(JSON.stringify({ "itemA": $(this).attr("value") }), (data) => {
      //hide();
      $('[name="ButtonB"]').attr("value", data.itemB.value).attr("src", data.itemB.url);
      //shuffle();
      //show();
    })
  });

  //If we pick B, change A
  $('[name="ButtonB"]').click(function(){
    get(JSON.stringify({ "itemB": $(this).attr("value") }), (data) => {
      //hide();
      $('[name="ButtonA"]').attr("value", data.itemA.value).attr("src", data.itemA.url);
      //shuffle();
      //show();
    })
  });

  function hide(){
    $('#experiment').slideUp(300);
  }

  function show(){
    $('#experiment').slideDown(450);
  }

  function shuffle(){

  }

  function get(request, callback){
    console.log("Sending: " + request);
    $.ajax({
      url: '',
      type: 'POST',
      data: request,
      contentType: 'application/json; charset=utf-8',
      dataType:'json',
      success: function(responseData) {
        console.log("Recieving: " + responseData);
        callback(responseData);
      },
      error: function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("Error Recieving");
        callback();
      }
    });
  }

});

</script>