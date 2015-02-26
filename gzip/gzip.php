<?
// GZIP JAVASCRIPT + CSS 1.1.1
// 03/12/2008
// © Jason Stockton 2008
// http://mooglemedia.com.au
// http://thewebdevelopmentblog.com/
// PHP 5+ ONLY
$expiry = 3;
if($_GET["exp"]) {
	$expiry = $_GET["exp"];
}
for($i=0; $i<100; $i++) {
	$file = $_GET["f$i"];
	if($file) {
		if(file_exists($file)) {
			$ext = strtolower(substr($file, strrpos($file, ".")));
			if($ext == ".css" || $ext == ".js") {
				$content .= file_get_contents($file);
				if(!$mytype) {
					$mytype = $ext;
				}
			}
		} else {
			$content .= "// FILE NOT FOUND '$file'\n\n";
		}
	} else {
		break;
	}
}
if($_GET["cache"]) {
	$expiresOffset = 3600 * 24 * $expiry;
} else {
	$expiresOffset = 20;
}
if($mytype == ".css") {
	$type = "text/css";
} elseif($mytype == ".js") {
	$type = "text/javascript";
} else {
	die();
}
header("Content-type: $type; charset: UTF-8");
header("Content-Encoding: gzip");
header("Expires: " . gmdate("D, d M Y H:i:s", time() + $expiresOffset) . " GMT");
$compressed = gzencode($content, 9, FORCE_GZIP);
echo $compressed;
?>