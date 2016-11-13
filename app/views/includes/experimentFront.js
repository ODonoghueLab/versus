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
          $('[name="ButtonA"]').attr("value", data.itemA).attr("src", "http://lorempixel.com/400/599/");
          $('[name="ButtonB"]').attr("value", data.itemB).attr("src", "http://lorempixel.com/400/601/");

        }
      });

      $('#experiment').slideDown(150);
    })

  });


  //Choices
  $('[name="ButtonA"]').click(function(){
    get(JSON.stringify({ "itemA": $(this).attr("value") }), (data) => {
      $('[name="ButtonB"]').attr("value", data.itemB).attr("src", "http://lorempixel.com/400/601/");
    })
  });

  $('[name="ButtonB"]').click(function(){
    get(JSON.stringify({ "itemB": $(this).attr("value") }), (data) => {
      $('[name="ButtonA"]').attr("value", data.itemB).attr("src", "http://lorempixel.com/400/601/");
    })
  });

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
        console.log(error);
        callback();
      }
    });
  }

});

</script>