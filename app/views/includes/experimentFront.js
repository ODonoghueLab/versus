<script type="text/javascript">

/* eslint-disable */
$(document).ready( () => {

  $('[name="ButtonA"]').click(function(){
    send($(this).attr("value"))
  });

  $('[name="ButtonB"]').click(function(){
    send($(this).attr("value"))
  });

  function send(val){
    console.log(val);
    $.ajax({
      url: '',
      type: 'POST',
      data: val,
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      success: (val) => alert(val)
    });
  }

});

</script>