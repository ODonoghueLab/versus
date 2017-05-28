<script type="text/javascript">
  /* eslint-disable */

  $(document).ready(() => {

    //Setup Page
    $('#experiment').slideUp(0);

  //Start
  $('[name="startButton"]').click(function(){
    // Hide the opening dialogue.
    $('#welcome').hide();

      //animation
      $('#experimentStart').slideUp(150,()=>{

        //recieve first two in buffer
        get(JSON.stringify({
          start: true,
          age: $('[name="ageDrop"]').val(),
          gender: $('[name="genderDrop"]').val(),
        }), (data) => {
          if(typeof data !== typeof undefined){

            //append DOM
            $('[name="ButtonA"]').attr("val", data.itemA.value).attr("src", data.itemA.url);
            $('[name="ButtonB"]').attr("val", data.itemB.value).attr("src", data.itemB.url);

          }
        });

        $('#experiment').slideDown(150);
      })

    });


    //Choices
    //If we pick A, change B
    $('[name="ButtonA"]').click(function(){
      get(JSON.stringify({ "return": $('[name="ButtonA"]').attr("val") }), (data) => {
        console.log('Receiving:', JSON.stringify(data, null, 2));
        if(!data.done) {
          $('[name="ButtonB"]').attr("val", data.itemB.value).attr("src", data.itemB.url);
          if (data.itemA.url !== $('[name="ButtonA"]').attr("src")) {
            $('[name="ButtonA"]').attr("val", data.itemA.value).attr("src", data.itemA.url);
          }
        } else {
          window.location.href += '/done';
        }
      })
    });

    //If we pick B, change A
    $('[name="ButtonB"]').click(function(){
      get(JSON.stringify({ "return": $('[name="ButtonB"]').attr("val") }), (data) => {
        console.log('Receiving:', JSON.stringify(data, null, 2));
        if(!data.done) {
          $('[name="ButtonA"]').attr("val", data.itemA.value).attr("src", data.itemA.url);
          if (data.itemB.url !== $('[name="ButtonB"]').attr("src")) {
            $('[name="ButtonB"]').attr("val", data.itemB.value).attr("src", data.itemB.url);
          }
        } else {
          window.location.href += '/done';
        }
      })
    });

    function get(request, callback){
      console.log('Sending:', request);

      $.ajax({
        url: '',
        type: 'POST',
        data: request,
        contentType: 'application/json; charset=utf-8',
        dataType:'json',
        success: function(responseData) {
          console.log('Receiving:', JSON.stringify(responseData, null, 2));
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