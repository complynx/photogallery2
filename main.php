<?php
define("IN_CLX", true);
error_reporting(E_ALL ^ E_NOTICE);

session_start();

include_once("config.php");

header('Content-type: application/json');

if(isset($_REQUEST["is_admin"])){
    echo json_encode(array("admin"=>true));
    die();
}
