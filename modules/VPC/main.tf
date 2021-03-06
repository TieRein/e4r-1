resource "aws_vpc" "mod" {
  cidr_block           = "${var.cidr}"
  enable_dns_hostnames = "${var.enable_dns_hostnames}"
  enable_dns_support   = "${var.enable_dns_support}"
  tags                 = "${merge(var.tags, map("Name", format("%s", var.name)))}"
}

resource "aws_internet_gateway" "mod" {
  vpc_id = "${aws_vpc.mod.id}"
  tags   = "${merge(var.tags, map("Name", format("%s-igw", var.name)))}"
}

resource "aws_route_table" "public" {
  vpc_id           = "${aws_vpc.mod.id}"
  tags             = "${merge(var.tags, map("Name", format("%s-rt-public", var.name)))}"
}

resource "aws_route" "public_internet_gateway" {
  route_table_id         = "${aws_route_table.public.id}"
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = "${aws_internet_gateway.mod.id}"
}

# resource "aws_route" "public_vpn_route" {
#   route_table_id         = "${aws_route_table.public.id}"
#   destination_cidr_block = "${var.vpn_cidr}"
#   instance_id            = "${var.vpn_instance_id}"
# }

resource "aws_route" "private_nat_gateway" {
  route_table_id         = "${element(aws_route_table.private.*.id, count.index)}"
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = "${element(aws_nat_gateway.natgw.*.id, count.index)}"
  count                  = "${length(var.azs) * lookup(map(var.enable_nat_gateway, 1), "true", 0)}"
}

# resource "aws_route" "private_vpn_route" {
#   route_table_id         = "${element(aws_route_table.private.*.id, count.index)}"
#   destination_cidr_block = "${var.vpn_cidr}"
#   instance_id            = "${var.vpn_instance_id}"
#   count                  = "${length(var.azs) * lookup(map(var.enable_nat_gateway, 1), "true", 0)}"
# }

resource "aws_route_table" "private" {
  vpc_id           = "${aws_vpc.mod.id}"
  count            = "${length(var.azs)}"
  tags             = "${merge(var.tags, map("Name", format("%s-rt-private-%s", var.name, element(var.azs, count.index))))}"
}

resource "aws_subnet" "private" {
  vpc_id            = "${aws_vpc.mod.id}"
  cidr_block        = "${var.private_subnets[count.index]}"
  availability_zone = "${element(var.azs, count.index)}"
  count             = "${length(var.private_subnets)}"
  tags              = "${merge(var.tags, var.private_subnet_tags, map("Name", format("%s-subnet-private-%s", var.name, element(var.azs, count.index))))}"
}

resource "aws_subnet" "envoy_database" {
  vpc_id            = "${aws_vpc.mod.id}"
  cidr_block        = "${var.envoy_database_subnets[count.index]}"
  availability_zone = "${element(var.azs, count.index)}"
  count             = "${length(var.envoy_database_subnets)}"
  tags              = "${merge(var.tags, var.envoy_database_subnet_tags, map("Name", format("%s-subnet-database-%s", var.name, element(var.azs, count.index))))}"
}

resource "aws_subnet" "cloud_database" {
  vpc_id            = "${aws_vpc.mod.id}"
  cidr_block        = "${var.cloud_database_subnets[count.index]}"
  availability_zone = "${element(var.azs, count.index)}"
  count             = "${length(var.cloud_database_subnets)}"
  tags              = "${merge(var.tags, var.cloud_database_subnet_tags, map("Name", format("%s-subnet-database-%s", var.name, element(var.azs, count.index))))}"
}

resource "aws_db_subnet_group" "envoy_database" {
  name        = "${var.name}-envoy-rds-subnet-group"
  description = "Database subnet groups for ${var.name}"
  subnet_ids  = ["${aws_subnet.envoy_database.*.id}"]
  tags        = "${merge(var.tags, map("Name", format("%s-database-subnet-group", var.name)))}"
  count       = "${length(var.envoy_database_subnets) > 0 ? 1 : 0}"
}

resource "aws_db_subnet_group" "cloud_database" {
  name        = "${var.name}-cloud-rds-subnet-group"
  description = "Database subnet groups for ${var.name}"
  subnet_ids  = ["${aws_subnet.cloud_database.*.id}"]
  tags        = "${merge(var.tags, map("Name", format("%s-database-subnet-group", var.name)))}"
  count       = "${length(var.cloud_database_subnets) > 0 ? 1 : 0}"
}

resource "aws_subnet" "public" {
  vpc_id            = "${aws_vpc.mod.id}"
  cidr_block        = "${var.public_subnets[count.index]}"
  availability_zone = "${element(var.azs, count.index)}"
  count             = "${length(var.public_subnets)}"
  tags              = "${merge(var.tags, var.public_subnet_tags, map("Name", format("%s-subnet-public-%s", var.name, element(var.azs, count.index))))}"

  map_public_ip_on_launch = "${var.map_public_ip_on_launch}"
}

resource "aws_eip" "nateip" {
  vpc   = true
  count = "${length(var.azs) * lookup(map(var.enable_nat_gateway, 1), "true", 0)}"
}

resource "aws_nat_gateway" "natgw" {
  allocation_id = "${element(aws_eip.nateip.*.id, count.index)}"
  subnet_id     = "${element(aws_subnet.public.*.id, count.index)}"
  count         = "${length(var.azs) * lookup(map(var.enable_nat_gateway, 1), "true", 0)}"

  depends_on = ["aws_internet_gateway.mod"]
}

resource "aws_route_table_association" "private" {
  count          = "${length(var.private_subnets)}"
  subnet_id      = "${element(aws_subnet.private.*.id, count.index)}"
  route_table_id = "${element(aws_route_table.private.*.id, count.index)}"
}

resource "aws_route_table_association" "envoy_database" {
  count          = "${length(var.envoy_database_subnets)}"
  subnet_id      = "${element(aws_subnet.envoy_database.*.id, count.index)}"
  route_table_id = "${element(aws_route_table.private.*.id, count.index)}"
}

resource "aws_route_table_association" "cloud_database" {
  count          = "${length(var.cloud_database_subnets)}"
  subnet_id      = "${element(aws_subnet.cloud_database.*.id, count.index)}"
  route_table_id = "${aws_route_table.public.id}"
}

resource "aws_route_table_association" "public" {
  count          = "${length(var.public_subnets)}"
  subnet_id      = "${element(aws_subnet.public.*.id, count.index)}"
  route_table_id = "${aws_route_table.public.id}"
}
