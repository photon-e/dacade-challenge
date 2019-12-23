const contractSource = `
payable contract Post=
  record post ={
    id:int,
    title:string,
    content:string,
    author:address,
    tipped:int,
    timestamp:int,
    updated:int}
  record state ={
      post_counter:int,
      posts:map(int,post)}
  entrypoint init()={
    post_counter=0,
    posts={}}
  entrypoint getPostLength():int=
    state.post_counter

  stateful entrypoint create_post(
                        _title:string,
                        _content:string) =
    require(_title != "", "Title Needed")
    require(_content !=  "", "Content is Needed")
    if(_title != "" && _content != "")
        let new_post = {
                        id=getPostLength() + 1,
                        title=_title,
                        content=_content, 
                        timestamp=Chain.timestamp,
                        updated=Chain.timestamp,
                        author = Call.caller,
                        tipped=0}
        let index = getPostLength() + 1
        put(state{posts[index]=new_post,post_counter=index})
    
  entrypoint get_post_by_index(index:int) : post = 
    switch(Map.lookup(index, state.posts))
        None => abort("Post does not exist with this index")
        Some(x) => x  
  
  payable stateful entrypoint tip_post(_id :int)=
    let post = get_post_by_index(_id) 
    let post_author  = post.author : address
    Chain.spend(post_author, Call.value)
    let post_tipped = post.tipped + Call.value
    if(Call.value > 0)
      let updated_post = {id=post.id,
                title=post.title,
                content=post.content,
                timestamp=post.timestamp,
                author = post.author,
                tipped=post_tipped,
                updated=Chain.timestamp
                }
      put(state{posts[_id]=updated_post})
    else
      abort("NOT ENOUGH ae")`
const contractAddress ='ct_2NfLfaJx2y83WcX3xoaqVyJveCQyJDAbTRTJ9qXazGLf6VwTyA'

var client = null // client defuault null
var post_arr = [] // empty arr
var postListLength = 0 // empty product list lenghth


// asychronus read from the blockchain
async function callStatic(func, args) {
const contract = await client.getContractInstance(contractSource, {contractAddress});
  const calledGet = await contract.call(func, args, {callStatic: true}).catch(e => console.error(e));
  const decodedGet = await calledGet.decode().catch(e => console.error(e));
  return decodedGet;
}

//Create a asynchronous write call for our smart contract
async function contractCall(func, args, value) {
  const contract = await client.getContractInstance(contractSource, {contractAddress});
  console.log("Contract:", contract)
  const calledSet = await contract.call(func, args, {amount:value}).catch(e => console.error(e));
  console.log("CalledSet", calledSet)
  return calledSet;
}


// mustche

function renderPostList(){
  let template = $('#template').html();
  post_arr = post_arr.sort(function (a, b) {
    return b.tipped - a.tipped
  })
  Mustache.parse(template);
  var rendered = Mustache.render(template, {post_arr});
  $("#getAllPost").html(rendered); // id to render your temlplate
  console.log("Mustashe Template Display")
}


window.addEventListener('load', async() => {
  $("#loading-bar-spinner").show();

  client = await Ae.Aepp();
  console.log("Hello")
  var user_address = await client.address()
  document.getElementById("user_address").innerText = user_address; // adds the account address to the navbar
  postListLength = await callStatic('getPostLength',[]);
  console.log("Post Log", postListLength)
  for(let i = 1; i < postListLength + 1; i++){
    const getPostList = await callStatic('get_post_by_index', [i]);
    post_arr.push({
      post_counter:i,
      title:getPostList.title,
      id:getPostList.id,
      content:getPostList.content,
      timestamp:new Date(getPostList.timestamp),
      author:getPostList.author,
      tipped:Math.floor(getPostList.tipped/1000000000000000000),
      updated:new Date(getPostList.updated)
    })
  }
  renderPostList();  
  $("#loading-bar-spinner").hide();
});

$('#addPost').click(async function(event){
  $("#loading-bar-spinner").show();
    var title= ($("#title").val())
    var content= ($("#content").val())
    if(title && content){
      var new_post= await contractCall('create_post', [title, content],0) 
      console.log("ContractCall Was Successfull")
      console.log(new_post);
    }
    $("#loading-bar-spinner").hide();
    renderPostList()
  event.preventDefault();
})


 
// // Tip A Post
$("#getAllPost").on("click",".tipBtn", async function(event){
  $("#loading-bar-spinner").show();
console.log("CLicked")
  const dataIndex = event.target.id
  console.log(typeof dataIndex)
  const tipped_post = await contractCall('tip_post', [dataIndex],1.5*1000000000000000000);
  console.log(tipped_post)
  
  console.log("-----------------")
  console.log("Data Index:", dataIndex)
  console.log("--------------------------")
  console.log("Just Clicked The Buy Button")
  event.preventDefault();
  console.log("Tip Successfully Made")
  $("#loading-bar-spinner").hide();

});
