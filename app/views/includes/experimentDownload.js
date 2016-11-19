<script type="text/javascript">
  /* eslint-disable */

  $(document).ready(() => {

    //Start
    $('[name="downloadButton"]').click(function(){
      get(JSON.stringify({ "itemB": 1 }), (data) => {


        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(data));
        element.setAttribute('download', 'result-' + new Date().getTime() + '.json');

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
      });
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
      console.log("Recieving: ");
      console.log(responseData);
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