<?php
	$maps_directory = dirname($_SERVER['SCRIPT_FILENAME']) . DIRECTORY_SEPARATOR;
	$_GET['filename'] = preg_replace('=(\.\.|/)=', '', $_GET['filename']);

	if (!isset($_GET['filename']) || !file_exists($filename = ($maps_directory . $_GET['filename']))) {
		die(json_encode(array("error"=>"Bad Filename")));
	}

	$data = array("mapname" => substr($filename, 0, -4), "map" => array());

	$fp = fopen($filename, 'rb');

	$x = 1;
	$y = 0;

	while (!feof($fp)) {
		$c = fread($fp, 1);
		$num = unpack('C', $c);
		$data['map'][] = $num[1];
	}

	fclose($fp);

	// for some reason the last element
	// of the map array is null.. ????
	array_pop($data['map']);

	echo json_encode($data);
?>
